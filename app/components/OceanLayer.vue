<script setup lang="ts">
/*
 * OceanLayer: the living cartoon sea behind the app.
 *  - background: sandy floor, swaying kelp, rising bubbles, fish (and the odd school) swimming past
 *  - reactive:   hovering a button / card / panel makes fish dart out from behind it,
 *                the cursor leaves a bubble trail, clicks send out ripples
 * Fish are plain DOM + Web Animations, so nothing here re-renders Vue.
 */
const bg = ref<HTMLElement>()
const fx = ref<HTMLElement>()

/* ---------- fish art ---------- */
// every fish is T-Mobile magenta, in a few shades
const PALETTE = [
  { body: '#e20074', fin: '#b3005c', belly: '#ffd1e8' },
  { body: '#ff3d9a', fin: '#e20074', belly: '#ffe3f1' },
  { body: '#ff7ab8', fin: '#e20074', belly: '#fff0f7' },
  { body: '#c4006a', fin: '#8f004d', belly: '#ffc2e0' },
]
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Fish facing right. kind 0 = round, 1 = slim, 2 = puffy. */
function fishSVG(kind = Math.floor(Math.random() * 3)) {
  const c = pick(PALETTE)
  const [rx, ry] = kind === 1 ? [13, 5.2] : kind === 2 ? [10, 8] : [11, 6.8]
  const tailX = 20 - rx
  return `<svg viewBox="-2 0 40 24" width="100%" height="100%" aria-hidden="true">
    <g class="fishy__tail"><path d="M${tailX + 1} 12 L${tailX - 6} 5.5 L${tailX - 4} 12 L${tailX - 6} 18.5Z" fill="${c.fin}" stroke="#12224a" stroke-width="1.4" stroke-linejoin="round"/></g>
    <path d="M18 ${12 - ry + 0.5} Q22 ${12 - ry - 4} 25 ${12 - ry + 1}Z" fill="${c.fin}" stroke="#12224a" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="20" cy="12" rx="${rx}" ry="${ry}" fill="${c.body}" stroke="#12224a" stroke-width="1.5"/>
    <path d="M${20 - rx * 0.15} ${12 - ry * 0.75} q${-rx * 0.35} ${ry * 0.75} 0 ${ry * 1.5}" fill="none" stroke="${c.belly}" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="${20 + rx * 0.1}" cy="${12 + ry * 0.45}" rx="${rx * 0.5}" ry="${ry * 0.32}" fill="${c.belly}" opacity=".45"/>
    <circle cx="${20 + rx * 0.62}" cy="${12 - ry * 0.25}" r="1.7" fill="#12224a"/>
    <circle cx="${20 + rx * 0.62 - 0.5}" cy="${12 - ry * 0.25 - 0.5}" r=".55" fill="#fff"/>
  </svg>`
}

function makeFish(size: number) {
  const el = document.createElement('div')
  el.className = 'fishy'
  el.style.width = `${size}px`
  el.style.height = `${size * 0.6}px`
  el.innerHTML = `<div class="fishy__body">${fishSVG()}</div>`
  return el
}

/* ---------- reactive: fish dart out of hovered things ---------- */
const HOVER_SEL = [
  'button', 'a', '[role="radio"]', '[role="tab"]', '.cyber-panel', '.scenario-card', '.stat-card',
  '.hub__track', '.cyber-badge', '.berth', '.action-btn', '.dash__skill', '.guides__scen-item', 'tbody tr',
].join(',')
const cooldown = new WeakMap<Element, number>()
let hovered: Element | null = null
let liveFx = 0

function burst(el: Element) {
  if (!fx.value || liveFx > 36) return
  const r = el.getBoundingClientRect()
  if (r.width < 8 || r.height < 8) return
  const big = r.width * r.height > 40000
  const n = big ? Math.round(rand(2, 4)) : Math.round(rand(1, 2))
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  for (let i = 0; i < n; i++) {
    // start somewhere on the element's edge, then swim outward from its center
    const side = Math.floor(Math.random() * 4)
    const t = Math.random()
    const sx = side === 0 ? r.left + t * r.width : side === 1 ? r.right : side === 2 ? r.left + t * r.width : r.left
    const sy = side === 0 ? r.top : side === 1 ? r.top + t * r.height : side === 2 ? r.bottom : r.top + t * r.height
    let ang = Math.atan2(sy - cy, sx - cx) + rand(-0.5, 0.5)
    const dist = rand(70, big ? 220 : 140)
    const ex = sx + Math.cos(ang) * dist
    const ey = sy + Math.sin(ang) * dist
    const size = big ? rand(22, 36) : rand(14, 24)
    const deg = (ang * 180) / Math.PI
    const flip = Math.abs(deg) > 90 ? -1 : 1 // keep belly down when swimming left
    const fish = makeFish(size)
    fx.value.appendChild(fish)
    liveFx++
    const mid = { x: sx + (ex - sx) * 0.45 + rand(-14, 14), y: sy + (ey - sy) * 0.45 + rand(-14, 14) }
    const tf = (x: number, y: number, s: number) =>
      `translate(${x - size / 2}px, ${y - size * 0.3}px) rotate(${deg}deg) scale(${s}, ${s * flip})`
    fish.animate(
      [
        { transform: tf(sx, sy, 0.15), opacity: 0, filter: 'blur(3px)' },
        { transform: tf(mid.x, mid.y, 1), opacity: 1, filter: 'blur(0px)', offset: 0.35 },
        { transform: tf(ex, ey, 0.9), opacity: 0, filter: 'blur(1px)' },
      ],
      { duration: rand(1100, 1700), easing: 'cubic-bezier(.2,.8,.3,1)', delay: i * 70, fill: 'both' },
    ).onfinish = () => { fish.remove(); liveFx-- }
    if (Math.random() < 0.6) bubbles(sx, sy, 2)
  }
}

function onOver(e: PointerEvent) {
  const el = (e.target as Element | null)?.closest?.(HOVER_SEL) ?? null
  if (el === hovered) return
  hovered = el
  if (!el) return
  const now = performance.now()
  if ((cooldown.get(el) ?? 0) > now) return
  cooldown.set(el, now + 1100)
  burst(el)
}

/* ---------- reactive: bubble trail + click ripples ---------- */
function bubbles(x: number, y: number, n: number, big = false) {
  if (!fx.value) return
  for (let i = 0; i < n; i++) {
    const b = document.createElement('span')
    b.className = 'bub'
    const s = big ? rand(6, 14) : rand(3, 8)
    b.style.width = b.style.height = `${s}px`
    fx.value.appendChild(b)
    const dx = rand(-16, 16)
    b.animate(
      [
        { transform: `translate(${x - s / 2}px, ${y - s / 2}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${x - s / 2 + dx * 0.4}px, ${y - 20}px) scale(1)`, opacity: 0.9, offset: 0.25 },
        { transform: `translate(${x - s / 2 + dx}px, ${y - rand(50, 100)}px) scale(1.15)`, opacity: 0 },
      ],
      { duration: rand(800, 1300), easing: 'ease-out', delay: i * 50, fill: 'both' },
    ).onfinish = () => b.remove()
  }
}
let lastTrail = { t: 0, x: 0, y: 0 }
function onMove(e: PointerEvent) {
  const now = performance.now()
  if (now - lastTrail.t < 70) return
  if (Math.hypot(e.clientX - lastTrail.x, e.clientY - lastTrail.y) < 18) return
  lastTrail = { t: now, x: e.clientX, y: e.clientY }
  bubbles(e.clientX + 4, e.clientY + 10, 1)
}
function onDown(e: PointerEvent) {
  if (!fx.value) return
  for (let i = 0; i < 2; i++) {
    const r = document.createElement('span')
    r.className = 'ripple'
    fx.value.appendChild(r)
    r.animate(
      [
        { transform: `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(.1)`, opacity: 0.8 },
        { transform: `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
      ],
      { duration: 700, delay: i * 140, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' },
    ).onfinish = () => r.remove()
  }
  bubbles(e.clientX, e.clientY, 4, true)
}

/* ---------- background: fish and schools swimming past ---------- */
let liveBg = 0
/** progress: start partway across (used on load so the sea isn't empty) */
function swimBy(progress = 0) {
  if (!bg.value || liveBg > 16 || document.hidden) return
  const school = Math.random() < 0.22
  const count = school ? Math.round(rand(4, 7)) : 1
  const depth = rand(0, 1) // 0 = far, 1 = near
  const fromLeft = Math.random() < 0.5
  const W = window.innerWidth
  const y0 = rand(0.15, 0.8) * window.innerHeight
  const dur = rand(11000, 20000) * (1.25 - depth * 0.45)
  for (let i = 0; i < count; i++) {
    const size = school ? rand(18, 26) : 24 + depth * 40
    const fish = makeFish(size)
    fish.style.opacity = String(0.55 + depth * 0.45)
    fish.style.filter = `blur(${(1 - depth) * 0.8}px)`
    bg.value.appendChild(fish)
    liveBg++
    const off = school ? { x: rand(-50, 50) - i * 18, y: rand(-30, 30) } : { x: 0, y: 0 }
    const xa = fromLeft ? -80 + off.x : W + 80 - off.x
    const x1 = fromLeft ? W + 120 : -120
    const x0 = xa + (x1 - xa) * progress
    const y = y0 + off.y
    const s = fromLeft ? 1 : -1 // scaleX flips the fish to face left
    const kf = [0, 0.25, 0.5, 0.75, 1].map((o, k) => ({
      transform: `translate(${x0 + (x1 - x0) * o}px, ${y + Math.sin(k * 1.6) * 22}px) scale(${s}, 1)`,
      offset: o,
    }))
    fish.animate(kf, { duration: dur * (1 - progress), delay: i * rand(80, 220), easing: 'linear', fill: 'both' }).onfinish = () => {
      fish.remove()
      liveBg--
    }
  }
}

/* ---------- static decor ---------- */
const AMBIENT_BUBBLES = Array.from({ length: 18 }, () => ({
  left: `${rand(2, 98)}%`,
  size: `${rand(4, 14)}px`,
  dur: `${rand(9, 20)}s`,
  delay: `${-rand(0, 20)}s`,
  drift: `${rand(-30, 30)}px`,
}))
const KELP = [
  { x: 2, h: 280, w: 36, c: '#2fbf5f', d: '6s' }, { x: 5, h: 190, w: 28, c: '#5ad46e', d: '4.5s' },
  { x: 8, h: 340, w: 32, c: '#23a352', d: '7s' }, { x: 87, h: 230, w: 32, c: '#5ad46e', d: '5.2s' },
  { x: 91, h: 360, w: 38, c: '#23a352', d: '6.6s' }, { x: 95, h: 200, w: 26, c: '#7be07f', d: '4.2s' },
]
const kelpPath = (h: number, w: number) =>
  `M${w / 2} ${h} C${w * 0.1} ${h * 0.8} ${w * 0.9} ${h * 0.62} ${w / 2} ${h * 0.45} S${w * 0.05} ${h * 0.18} ${w * 0.55} 0`

/* ---------- lifecycle: only listen while the theme is on ---------- */
let timer: ReturnType<typeof setInterval> | undefined
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
function start() {
  if (reduced()) return
  document.addEventListener('pointerover', onOver, { passive: true })
  document.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerdown', onDown, { passive: true })
  timer = setInterval(() => swimBy(), 1700)
  // stock the sea right away: a few fish already mid-swim
  for (let i = 0; i < 6; i++) swimBy(rand(0.1, 0.7))
}
function stop() {
  document.removeEventListener('pointerover', onOver)
  document.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerdown', onDown)
  clearInterval(timer)
  liveBg = 0
  liveFx = 0
}
onMounted(() => {
  nextTick(start)
})
onBeforeUnmount(stop)
</script>

<template>
  <div ref="bg" class="ocean" aria-hidden="true">
      <svg class="ocean__surface" viewBox="0 0 1200 40" preserveAspectRatio="none">
        <path d="M0 18 Q50 4 100 18 T200 18 T300 18 T400 18 T500 18 T600 18 T700 18 T800 18 T900 18 T1000 18 T1100 18 T1200 18 V0 H0Z" fill="rgba(255,255,255,.55)" />
        <path d="M0 18 Q50 4 100 18 T200 18 T300 18 T400 18 T500 18 T600 18 T700 18 T800 18 T900 18 T1000 18 T1100 18 T1200 18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      </svg>
      <div class="ocean__floor">
        <svg viewBox="0 0 1200 90" preserveAspectRatio="none"><path d="M0 40 Q150 10 300 34 T600 30 T900 38 T1200 26 V90 H0Z" fill="#ffe08a" stroke="#12224a" stroke-width="2.5" /><circle cx="180" cy="62" r="3" fill="#e8b84a" /><circle cx="520" cy="58" r="4" fill="#e8b84a" /><circle cx="860" cy="66" r="3" fill="#e8b84a" /><circle cx="1040" cy="52" r="2.5" fill="#e8b84a" /></svg>
      </div>
      <svg
        v-for="(k, i) in KELP" :key="i" class="ocean__kelp"
        :style="{ left: `${k.x}%`, height: `${k.h}px`, width: `${k.w}px`, animationDuration: k.d }"
        :viewBox="`0 0 ${k.w} ${k.h}`" preserveAspectRatio="none"
      >
        <path :d="kelpPath(k.h, k.w)" fill="none" stroke="#12224a" :stroke-width="k.w * 0.32 + 4" stroke-linecap="round" />
        <path :d="kelpPath(k.h, k.w)" fill="none" :stroke="k.c" :stroke-width="k.w * 0.32" stroke-linecap="round" />
        <path :d="kelpPath(k.h, k.w)" fill="none" stroke="rgba(255,255,255,.35)" :stroke-width="k.w * 0.07" stroke-linecap="round" />
      </svg>
      <span
        v-for="(b, i) in AMBIENT_BUBBLES" :key="'b' + i" class="ocean__bubble"
        :style="{ left: b.left, width: b.size, height: b.size, animationDuration: b.dur, animationDelay: b.delay, '--drift': b.drift }"
      />
    </div>
  <div ref="fx" class="ocean-fx" aria-hidden="true" />
</template>

<style scoped>
.ocean, .ocean-fx { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
.ocean { z-index: -1; }
.ocean-fx { z-index: 80; }
.ocean__surface { position: absolute; left: -5%; top: 0; width: 110%; height: 34px; animation: waves 6s ease-in-out infinite alternate; }
@keyframes waves { from { transform: translateX(0); } to { transform: translateX(-4%); } }
.ocean__floor { position: absolute; left: 0; right: 0; bottom: 0; height: 90px; }
.ocean__floor svg { width: 100%; height: 100%; display: block; }
.ocean__kelp { position: absolute; bottom: 30px; overflow: visible; transform-origin: 50% 100%; animation: kelp-sway 6s ease-in-out infinite alternate; }
.ocean__bubble {
  position: absolute; bottom: -20px; border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, .9);
  background: radial-gradient(circle at 30% 30%, #fff 0 18%, rgba(255, 255, 255, .2) 22%, transparent 70%);
  animation: rise linear infinite;
}
@keyframes rise {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: .8; }
  50% { transform: translate(var(--drift), -55vh); }
  100% { transform: translate(0, -110vh); opacity: 0; }
}
@keyframes kelp-sway { from { transform: rotate(-4deg) skewX(-3deg); } to { transform: rotate(4deg) skewX(3deg); } }

/* created at runtime, so these need :deep */
.ocean :deep(.fishy), .ocean-fx :deep(.fishy) { position: absolute; left: 0; top: 0; will-change: transform, opacity; }
:deep(.fishy__body) { width: 100%; height: 100%; animation: fish-wiggle .35s ease-in-out infinite alternate; transform-origin: 60% 50%; }
.ocean-fx :deep(.fishy) { filter: drop-shadow(2px 3px 0 rgba(18, 34, 74, .25)); }
@keyframes fish-wiggle { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
.ocean-fx :deep(.bub) {
  position: absolute; left: 0; top: 0; border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(10, 100, 180, .35);
  background: radial-gradient(circle at 30% 30%, #fff 0 20%, rgba(255, 255, 255, .25) 25%, transparent 70%);
}
.ocean-fx :deep(.ripple) {
  position: absolute; left: 0; top: 0; width: 90px; height: 90px; border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px rgba(var(--rgb-magenta), .5);
}
</style>
