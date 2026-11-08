<script setup lang="ts">
/*
 * TableLayer: the High Stakes theme's living background.
 *  - background: a deck of cards drifting through the dark, the odd charged card thrown
 *                across with a pink trail, a VHS on-screen display whose tape is running out
 *  - reactive:   hovering a button / card / panel flicks charged cards out of it,
 *                the cursor sheds pink embers, clicks set off a kinetic burst
 * Plain DOM + Web Animations, like OceanLayer, so nothing here re-renders Vue.
 */
const bg = ref<HTMLElement>()
const fx = ref<HTMLElement>()
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

const SUITS = [
  { s: '♥', red: true }, { s: '♦', red: true }, { s: '♠', red: false }, { s: '♣', red: false },
] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '7'] as const

function makeCard(w: number, charged = false) {
  const { s, red } = pick(SUITS)
  const el = document.createElement('div')
  el.className = `pcard${red ? ' is-red' : ''}${charged ? ' is-charged' : ''}`
  el.style.width = `${w}px`
  el.style.height = `${w * 1.4}px`
  el.style.fontSize = `${w * 0.2}px`
  el.innerHTML = `<span class="pcard__i">${pick(RANKS)}<br>${s}</span><span class="pcard__c">${s}</span><span class="pcard__i pcard__i--b">${s}</span>`
  return el
}

/* ---------- reactive: cards flick out of hovered things ---------- */
const HOVER_SEL = [
  'button', 'a', '[role="radio"]', '[role="tab"]', '.cyber-panel', '.scenario-card', '.stat-card',
  '.hub__track', '.cyber-badge', '.action-btn', '.dash__skill', '.guides__scen-item', '.ledger-card', 'tbody tr',
].join(',')
const cooldown = new WeakMap<Element, number>()
let hovered: Element | null = null
let liveFx = 0

function burst(el: Element) {
  if (!fx.value || liveFx > 30) return
  const r = el.getBoundingClientRect()
  if (r.width < 8 || r.height < 8) return
  const big = r.width * r.height > 40000
  const n = big ? Math.round(rand(2, 3)) : 1
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  for (let i = 0; i < n; i++) {
    const side = Math.floor(Math.random() * 4)
    const t = Math.random()
    const sx = side === 0 ? r.left + t * r.width : side === 1 ? r.right : side === 2 ? r.left + t * r.width : r.left
    const sy = side === 0 ? r.top : side === 1 ? r.top + t * r.height : side === 2 ? r.bottom : r.top + t * r.height
    const ang = Math.atan2(sy - cy, sx - cx) + rand(-0.6, 0.6)
    const dist = rand(80, big ? 220 : 150)
    const w = big ? rand(22, 30) : rand(16, 22)
    const card = makeCard(w, true)
    fx.value.appendChild(card)
    liveFx++
    const spin = rand(-540, 540)
    const ex = sx + Math.cos(ang) * dist
    const ey = sy + Math.sin(ang) * dist
    const tf = (x: number, y: number, rot: number, s: number) => `translate(${x - w / 2}px, ${y - w * 0.7}px) rotate(${rot}deg) scale(${s})`
    card.animate(
      [
        { transform: tf(sx, sy, 0, 0.2), opacity: 0 },
        { transform: tf(sx + (ex - sx) * 0.4, sy + (ey - sy) * 0.4, spin * 0.4, 1), opacity: 1, offset: 0.3 },
        { transform: tf(ex, ey, spin, 0.85), opacity: 0 },
      ],
      { duration: rand(900, 1400), easing: 'cubic-bezier(.15,.8,.3,1)', delay: i * 80, fill: 'both' },
    ).onfinish = () => { card.remove(); liveFx-- }
  }
  sparks(cx + rand(-r.width / 3, r.width / 3), r.top, 4)
}

function onOver(e: PointerEvent) {
  const el = (e.target as Element | null)?.closest?.(HOVER_SEL) ?? null
  if (el === hovered) return
  hovered = el
  if (!el || el.closest('.auth__card')) return
  const now = performance.now()
  if ((cooldown.get(el) ?? 0) > now) return
  cooldown.set(el, now + 1100)
  burst(el)
}

/* ---------- reactive: embers + kinetic click ---------- */
function sparks(x: number, y: number, n: number, big = false) {
  if (!fx.value) return
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span')
    s.className = 'ember'
    const size = big ? rand(3, 6) : rand(2, 4)
    s.style.width = s.style.height = `${size}px`
    fx.value.appendChild(s)
    const a = rand(0, Math.PI * 2)
    const d = big ? rand(40, 110) : rand(16, 46)
    s.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
        { transform: `translate(${x + Math.cos(a) * d}px, ${y + Math.sin(a) * d + 12}px) scale(.2)`, opacity: 0 },
      ],
      { duration: rand(450, 900), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' },
    ).onfinish = () => s.remove()
  }
}
let last = { t: 0, x: 0, y: 0 }
function onMove(e: PointerEvent) {
  const now = performance.now()
  if (now - last.t < 60 || Math.hypot(e.clientX - last.x, e.clientY - last.y) < 16) return
  last = { t: now, x: e.clientX, y: e.clientY }
  sparks(e.clientX + 2, e.clientY + 2, 1)
}
function onDown(e: PointerEvent) {
  if (!fx.value) return
  for (let i = 0; i < 2; i++) {
    const r = document.createElement('span')
    r.className = 'kinetic'
    fx.value.appendChild(r)
    r.animate(
      [
        { transform: `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(.1)`, opacity: 1 },
        { transform: `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
      ],
      { duration: 520, delay: i * 90, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'both' },
    ).onfinish = () => r.remove()
  }
  sparks(e.clientX, e.clientY, 10, true)
}

/* ---------- background: drifting deck + thrown cards ---------- */
let liveBg = 0
function drift(progress = 0) {
  if (!bg.value || liveBg > 14 || document.hidden) return
  const depth = rand(0, 1)
  const w = 22 + depth * 30
  const card = makeCard(w, Math.random() < 0.18)
  card.style.opacity = String(0.12 + depth * 0.3)
  card.style.filter = `blur(${(1 - depth) * 1.5}px)`
  bg.value.appendChild(card)
  liveBg++
  const W = window.innerWidth
  const H = window.innerHeight
  const x = rand(0, W)
  const y0 = -80
  const y1 = H + 80
  const dur = rand(18000, 32000) * (1.3 - depth * 0.5)
  const r0 = rand(-180, 180)
  const spin = rand(-260, 260)
  const sway = rand(30, 90)
  const ys = y0 + (y1 - y0) * progress
  const kf = [0, 0.33, 0.66, 1].map((o, k) => ({
    transform: `translate(${x + Math.sin(k * 2.1) * sway}px, ${ys + (y1 - ys) * o}px) rotate(${r0 + spin * o}deg) rotateY(${o * 360}deg)`,
    offset: o,
  }))
  card.animate(kf, { duration: dur * (1 - progress), easing: 'linear', fill: 'both' }).onfinish = () => { card.remove(); liveBg-- }
}
function throwCard() {
  if (!bg.value || document.hidden) return
  const W = window.innerWidth
  const H = window.innerHeight
  const fromLeft = Math.random() < 0.5
  const y = rand(0.15, 0.7) * H
  const card = makeCard(26, true)
  card.classList.add('is-thrown')
  bg.value.appendChild(card)
  const x0 = fromLeft ? -60 : W + 60
  const x1 = fromLeft ? W + 60 : -60
  card.animate(
    [
      { transform: `translate(${x0}px, ${y}px) rotate(0deg)` },
      { transform: `translate(${x1}px, ${y + rand(-120, 120)}px) rotate(${fromLeft ? 1440 : -1440}deg)` },
    ],
    { duration: rand(1300, 1900), easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'both' },
  ).onfinish = () => card.remove()
}

/* ---------- VHS on-screen display: the tape is running out ---------- */
const tape = ref(59 * 60 + 59)
const tapeText = computed(() => {
  const m = Math.floor(tape.value / 60)
  const s = tape.value % 60
  return `-00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

/* ---------- lifecycle ---------- */
const timers: ReturnType<typeof setInterval>[] = []
onMounted(() => {
  timers.push(setInterval(() => { tape.value = tape.value > 0 ? tape.value - 1 : 59 * 60 + 59 }, 1000))
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.addEventListener('pointerover', onOver, { passive: true })
  document.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerdown', onDown, { passive: true })
  for (let i = 0; i < 8; i++) drift(rand(0.05, 0.8))
  timers.push(setInterval(() => drift(), 2200))
  timers.push(setInterval(throwCard, 7000))
})
onBeforeUnmount(() => {
  timers.forEach(clearInterval)
  document.removeEventListener('pointerover', onOver)
  document.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerdown', onDown)
})
</script>

<template>
  <div ref="bg" class="table-bg" aria-hidden="true" />
  <div ref="fx" class="table-fx" aria-hidden="true" />
  <div class="vhs" aria-hidden="true">
    <span class="vhs__play">PLAY ▶</span>
    <span class="vhs__tape">SP {{ tapeText }}</span>
  </div>
</template>

<style scoped>
.table-bg, .table-fx { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
.table-bg { z-index: -1; perspective: 900px; }
.table-fx { z-index: 80; }

/* playing cards (created at runtime, so :deep) */
:deep(.pcard) {
  position: absolute; left: 0; top: 0;
  border-radius: 10%;
  background: linear-gradient(160deg, #fbf4e8, #e9dcc6);
  border: 1px solid rgba(0, 0, 0, .35);
  color: #1d1416;
  font-family: Georgia, 'Times New Roman', serif; font-weight: 700;
  box-shadow: 0 4px 10px rgba(0, 0, 0, .5);
  will-change: transform, opacity;
  backface-visibility: visible;
}
:deep(.pcard.is-red) { color: #d4145a; }
:deep(.pcard__i) { position: absolute; left: 9%; top: 6%; line-height: 1; text-align: center; }
:deep(.pcard__i--b) { left: auto; top: auto; right: 9%; bottom: 6%; transform: rotate(180deg); }
:deep(.pcard__c) { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2.6em; }
/* charged: crackling kinetic pink */
:deep(.pcard.is-charged) {
  border-color: #ffd1e6;
  box-shadow: 0 0 0 1px #ff2e88, 0 0 10px #ff2e88, 0 0 24px rgba(255, 46, 136, .7);
  animation: crackle .18s steps(2) infinite;
}
:deep(.pcard.is-thrown) { box-shadow: 0 0 0 1px #ff2e88, 0 0 14px #ff2e88, -30px 0 40px rgba(255, 46, 136, .5), -60px 0 60px rgba(255, 46, 136, .25); }
@keyframes crackle { 50% { filter: brightness(1.3) drop-shadow(0 0 4px #fff); } }

.table-fx :deep(.ember) { position: absolute; left: 0; top: 0; border-radius: 50%; background: #ffd1e6; box-shadow: 0 0 6px #ff2e88, 0 0 12px #ff2e88; }
.table-fx :deep(.kinetic) {
  position: absolute; left: 0; top: 0; width: 110px; height: 110px; border-radius: 50%;
  border: 2px solid #ffd1e6;
  box-shadow: 0 0 14px #ff2e88, inset 0 0 14px #ff2e88;
}

/* VHS OSD, bottom-left, quietly running out of time */
.vhs {
  position: fixed; right: 18px; bottom: 14px; z-index: 81; pointer-events: none; text-align: right;
  display: flex; flex-direction: column; gap: 0;
  font-family: var(--f-vhs); font-size: 22px; line-height: 1; letter-spacing: .08em;
  color: rgba(243, 234, 219, .55);
  text-shadow: 2px 0 rgba(255, 46, 136, .5), -2px 0 rgba(62, 224, 138, .4);
}
.vhs__play { animation: osd-blink 1.6s steps(1) infinite; }
@keyframes osd-blink { 60% { opacity: 0; } }
@media (max-width: 900px) { .vhs { display: none; } }
</style>
