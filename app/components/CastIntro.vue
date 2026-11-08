<script setup lang="ts">
/*
 * CastIntro: the Poisson landing intro, shown once per session on the sign-in page.
 * Rendered by the auth layout BEHIND the sign-in card, and it moves the real card:
 *
 *   aim   the rod follows your pointer; click / Space / Enter to cast (auto after a few seconds)
 *   cast  the rod swings, the hook lands where you aimed
 *   wait  the bobber floats
 *   bite  the bobber dips; click / Space / Enter to reel in (auto after a moment)
 *   reel  the fish comes up out of the water and the sign-in card rises right underneath it,
 *         landing exactly where it normally sits
 *   land  the fish slips the hook and swims off, the scene fades into the normal background
 *
 * Esc or "Skip intro" jumps to the end. One rAF loop drives everything; the hook position is
 * converted from SVG units to screen pixels so the card can hang off it precisely.
 */
const show = useState<boolean>('castIntro', () => false)

const WATER = 330
const PIVOT = { x: 190, y: 352 }
const ROD = 290
const FISH_DROP = 94 // svg units from the hook down to just below the hanging fish's tail

type Phase = 'aim' | 'cast' | 'wait' | 'bite' | 'reel' | 'land' | 'done'
const phase = ref<Phase>('aim')
const svg = ref<SVGSVGElement>()
const scene = ref<HTMLElement>()

/* reactive bits the template draws (updated each frame) */
const tip = reactive({ x: 0, y: 0 })
const hook = reactive({ x: 0, y: 0 })
const bobber = reactive({ x: 0, y: 0, on: false })
const fish = reactive({ on: false, tilt: 0, x: 0, y: 0, free: false, flip: 1 })
const splashes = ref<{ id: number; x: number }[]>([])
const hint = ref('')
const fade = ref(0) // 0 = scene fully shown, 1 = gone
const tagline = ref(0)

/* ---- helpers ---- */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (x: number) => 1 - (1 - x) ** 3
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const rad = (d: number) => (d * Math.PI) / 180
const tipAt = (deg: number) => ({ x: PIVOT.x + Math.cos(rad(deg)) * ROD, y: PIVOT.y - Math.sin(rad(deg)) * ROD })

/* ---- svg <-> screen ---- */
function ctm() {
  const m = svg.value?.getScreenCTM()
  return m ? { a: m.a, e: m.e, f: m.f } : { a: 1, e: 0, f: 0 }
}
const toScreen = (x: number, y: number) => { const m = ctm(); return { x: m.a * x + m.e, y: m.a * y + m.f } }
const toSvg = (x: number, y: number) => { const m = ctm(); return { x: (x - m.e) / m.a, y: (y - m.f) / m.a } }

/* ---- the real sign-in card ---- */
let card: HTMLElement | null = null
let rest = { cx: 0, top: 0, h: 0 }
const cardPos = { x: 0, y: 0, r: 0, o: 0 }
function measureCard() {
  if (!card) return
  const prev = card.style.transform
  card.style.transform = 'none'
  const r = card.getBoundingClientRect()
  card.style.transform = prev
  rest = { cx: r.left + r.width / 2, top: r.top, h: r.height }
}
function placeCard() {
  if (!card) return
  card.style.transform = `translate3d(${cardPos.x}px, ${cardPos.y}px, 0) rotate(${cardPos.r}deg)`
  card.style.opacity = String(cardPos.o)
}
function releaseCard() {
  if (!card) return
  card.style.transform = ''
  card.style.opacity = ''
  card.style.filter = ''
}

/* ---- timeline state ---- */
let raf = 0
let last = 0
let phaseAt = 0
let aimX = 0.6 // 0..1 across the screen
let splash = { x: 640, y: WATER }
let hookStart = { x: 640, y: WATER + 80 }
let hookEnd = { x: 500, y: 150 }
let castFrom = { x: 0, y: 0 }
let crossed = false
let autoTimer: ReturnType<typeof setTimeout> | undefined
let sid = 0

function go(p: Phase) {
  phase.value = p
  phaseAt = performance.now()
  clearTimeout(autoTimer)
  hint.value = ''
  if (p === 'aim') {
    setTimeout(() => { if (phase.value === 'aim') hint.value = 'Move to aim · click to cast' }, 700)
    autoTimer = setTimeout(() => { if (phase.value === 'aim') go('cast') }, 3600)
  }
  if (p === 'cast') {
    splash = { x: lerp(440, 820, aimX), y: WATER }
    castFrom = { ...tip }
  }
  if (p === 'bite') {
    hint.value = 'Fish on! Click to reel in'
    autoTimer = setTimeout(() => { if (phase.value === 'bite') go('reel') }, 2200)
  }
  if (p === 'reel') {
    crossed = false
    measureCard()
    hookStart = { x: splash.x + 6, y: WATER + 80 }
    // finish with the fish hanging right above where the card normally sits
    const end = toSvg(rest.cx, rest.top)
    hookEnd = { x: end.x, y: end.y - FISH_DROP }
    fish.on = true
    fish.free = false
  }
}

function addSplash(x: number) {
  const id = ++sid
  splashes.value.push({ id, x })
  setTimeout(() => { splashes.value = splashes.value.filter(s => s.id !== id) }, 1200)
}

function frame(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
  last = now
  const t = (now - phaseAt) / 1000
  const p = phase.value
  let angle = 62

  if (p === 'aim') {
    // rod leans with the pointer; the hook dangles from the tip
    angle = lerp(70, 54, aimX) + Math.sin(now / 900) * 1.5
    Object.assign(tip, tipAt(angle))
    hook.x = tip.x + Math.sin(now / 420) * 6
    hook.y = tip.y + 55
  } else if (p === 'cast') {
    // wind back, then swing through; the hook flies in an arc to where you aimed
    angle = t < 0.4 ? lerp(62, 112, easeInOut(t / 0.4)) : lerp(112, 32, easeOut(clamp((t - 0.4) / 0.4)))
    Object.assign(tip, tipAt(angle))
    if (t < 0.5) {
      hook.x = tip.x + Math.sin(t * 12) * 10
      hook.y = tip.y + 55
      castFrom = { x: hook.x, y: hook.y }
    } else {
      const u = easeOut(clamp((t - 0.5) / 0.8))
      hook.x = lerp(castFrom.x, splash.x, u)
      hook.y = lerp(castFrom.y, splash.y, u) - Math.sin(u * Math.PI) * 170
      if (u >= 1) { addSplash(splash.x); go('wait') }
    }
  } else if (p === 'wait' || p === 'bite') {
    angle = 32 + Math.sin(now / 1100) * 1
    Object.assign(tip, tipAt(angle))
    const sink = easeOut(clamp(t / 0.5))
    hook.x = splash.x + 6 + Math.sin(now / 700) * 3
    hook.y = p === 'wait' ? lerp(WATER, WATER + 80, sink) : WATER + 80
    bobber.on = true
    bobber.x = splash.x - 30
    const dip = p === 'bite' ? Math.max(0, Math.sin(t * 9)) * 12 : 0
    bobber.y = WATER - 3 + Math.sin(now / 500) * 1.5 + dip
    if (p === 'wait' && t > 1.3) go('bite')
  } else if (p === 'reel') {
    // the rod lifts, the fish comes up and travels to just above the card's resting spot
    const u = easeInOut(clamp(t / 1.5))
    angle = lerp(32, 76, easeOut(clamp(t / 0.9)))
    Object.assign(tip, tipAt(angle))
    bobber.on = t < 0.15
    hook.x = lerp(hookStart.x, hookEnd.x, u)
    hook.y = lerp(hookStart.y, hookEnd.y, u) - Math.sin(u * Math.PI) * 40
    fish.tilt = Math.sin(now / 90) * 14 * (1 - u * 0.6)
    if (!crossed && hook.y < WATER) { crossed = true; addSplash(hook.x) }
    tagline.value = clamp((t - 0.6) / 0.6)
    if (t >= 1.5) go('land')
  } else if (p === 'land') {
    angle = 76
    Object.assign(tip, tipAt(angle))
    if (t < 0.5) {
      // hanging still for a beat, a last wiggle
      hook.x = hookEnd.x
      hook.y = hookEnd.y
      fish.tilt = Math.sin(now / 70) * 10 * (1 - t / 0.5)
    } else {
      // slips the hook and swims off; the line reels back in
      fish.free = true
      const u = easeOut(clamp((t - 0.5) / 0.8))
      fish.x = lerp(hookEnd.x, hookEnd.x + 520, u)
      fish.y = lerp(hookEnd.y + 32, hookEnd.y - 60, u) + Math.sin(u * 10) * 8
      const r = easeInOut(clamp((t - 0.5) / 0.5))
      hook.x = lerp(hookEnd.x, tip.x, r)
      hook.y = lerp(hookEnd.y, tip.y + 40, r)
    }
    fade.value = clamp((t - 0.7) / 0.7)
    tagline.value = 1 - clamp((t - 0.6) / 0.6)
    if (t >= 1.45) go('done')
  } else if (p === 'done') {
    finish()
    return
  }

  // ---- the card: below the screen until the reel, then hanging under the fish ----
  if (card) {
    const water = toScreen(0, WATER).y
    if (p === 'reel' || p === 'land') {
      const h = toScreen(hook.x, hook.y)
      const m = ctm()
      const tx = p === 'land' ? 0 : h.x - rest.cx
      const ty = p === 'land' ? 0 : h.y + FISH_DROP * m.a - rest.top
      const k = 1 - Math.exp(-dt * (p === 'land' ? 10 : 8))
      const px = cardPos.x
      cardPos.x += (tx - cardPos.x) * k
      cardPos.y += (ty - cardPos.y) * k
      cardPos.r = clamp((cardPos.x - px) * 0.6, -6, 6) * (p === 'land' ? 1 - clamp(t / 0.6) : 1)
      // dim and soft while under the water, clear once it's out
      const under = rest.top + cardPos.y > water - 10
      cardPos.o += ((under ? 0.55 : 1) - cardPos.o) * k
      card.style.filter = under ? 'saturate(.7) blur(.6px)' : ''
    } else {
      const s = toScreen(splash.x, WATER)
      cardPos.x = s.x - rest.cx
      cardPos.y = window.innerHeight - rest.top + 40
      cardPos.r = 0
      cardPos.o = 0
    }
    placeCard()
  }
  raf = requestAnimationFrame(frame)
}

/* ---- interaction ---- */
function act() {
  if (phase.value === 'aim') go('cast')
  else if (phase.value === 'bite') go('reel')
}
function onMove(e: PointerEvent) {
  if (phase.value === 'aim') aimX = clamp(e.clientX / window.innerWidth)
}
function onDown(e: PointerEvent) {
  if ((e.target as Element | null)?.closest?.('.cast__skip')) return
  act()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); skip() }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act() }
}
function skip() {
  cardPos.x = 0
  cardPos.y = 0
  cardPos.r = 0
  cardPos.o = 1
  placeCard()
  finish()
}
let finished = false
function finish() {
  if (finished) return
  finished = true
  cancelAnimationFrame(raf)
  clearTimeout(autoTimer)
  releaseCard()
  show.value = false
}
function onResize() { measureCard() }

onMounted(() => {
  card = document.querySelector('.auth__card')
  measureCard()
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown)
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
  go('aim')
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(autoTimer)
  releaseCard()
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerdown', onDown)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
})

const line = computed(() => {
  if (bobber.on && (phase.value === 'wait' || phase.value === 'bite' || phase.value === 'reel')) {
    const mx = (tip.x + bobber.x) / 2
    const my = Math.max(tip.y, bobber.y) + 36
    return `M${tip.x} ${tip.y} Q${mx} ${my} ${bobber.x} ${bobber.y} L${hook.x} ${hook.y}`
  }
  if (phase.value === 'cast') {
    const mx = (tip.x + hook.x) / 2
    return `M${tip.x} ${tip.y} Q${mx} ${(tip.y + hook.y) / 2 + 26} ${hook.x} ${hook.y}`
  }
  return `M${tip.x} ${tip.y} L${hook.x} ${hook.y}`
})
const FISH = 'M-34 0 Q-20 -15 2 -14 Q22 -12 30 0 Q22 12 2 14 Q-20 15 -34 0Z'
const fishUnder = computed(() => fish.on && !fish.free && hook.y > WATER)
</script>

<template>
  <div ref="scene" class="cast" :style="{ opacity: 1 - fade }">
    <svg ref="svg" class="cast__scene" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ci-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#a9dcf6" /><stop offset="1" stop-color="#e3f5fd" />
        </linearGradient>
        <linearGradient id="ci-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4fb4e6" stop-opacity=".9" />
          <stop offset=".5" stop-color="#2a8fd2" stop-opacity=".95" />
          <stop offset="1" stop-color="#155f9f" />
        </linearGradient>
        <radialGradient id="ci-sun">
          <stop offset="0" stop-color="#fff8dc" /><stop offset=".35" stop-color="#fff1b8" stop-opacity=".8" /><stop offset="1" stop-color="#fff1b8" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="ci-fish" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff4fa8" /><stop offset="1" stop-color="#c2006a" />
        </linearGradient>
        <linearGradient id="ci-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b98457" /><stop offset="1" stop-color="#8a5b35" />
        </linearGradient>
        <filter id="ci-soft"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <!-- sky, soft sun and clouds -->
      <rect width="1000" :height="WATER" fill="url(#ci-sky)" />
      <circle cx="830" cy="96" r="120" fill="url(#ci-sun)" />
      <g fill="#fff" opacity=".75" filter="url(#ci-soft)" class="cast__clouds">
        <ellipse cx="200" cy="110" rx="90" ry="22" /><ellipse cx="250" cy="98" rx="60" ry="20" />
        <ellipse cx="560" cy="70" rx="80" ry="18" /><ellipse cx="610" cy="62" rx="50" ry="16" />
      </g>
      <line x1="0" :y1="WATER - 1" x2="1000" :y2="WATER - 1" stroke="#ffffff" stroke-opacity=".6" />

      <!-- under the surface: hook + hooked fish (the water tints them) -->
      <path v-if="hook.y > WATER" :d="`M${hook.x} ${hook.y} c0 9 -8 11 -8 4`" fill="none" stroke="#3a4152" stroke-width="2" stroke-linecap="round" />
      <g v-if="fishUnder" :transform="`translate(${hook.x} ${hook.y + 32}) rotate(${90 + fish.tilt})`">
        <path :d="FISH" fill="url(#ci-fish)" />
      </g>

      <!-- the sea -->
      <rect :y="WATER" width="1000" :height="600 - WATER" fill="url(#ci-sea)" />
      <g class="cast__glints" stroke="#fff" stroke-linecap="round" fill="none">
        <path :d="`M120 ${WATER + 26} h70 M420 ${WATER + 18} h50 M700 ${WATER + 40} h90 M300 ${WATER + 70} h60 M860 ${WATER + 90} h50 M560 ${WATER + 110} h70`" stroke-opacity=".35" stroke-width="2" />
      </g>

      <!-- dock -->
      <g>
        <rect x="-10" :y="WATER + 16" width="270" height="18" rx="2" fill="url(#ci-wood)" />
        <rect x="44" :y="WATER + 34" width="12" height="90" fill="#6e4528" />
        <rect x="194" :y="WATER + 34" width="12" height="90" fill="#6e4528" />
        <path :d="`M60 ${WATER + 16} v18 M120 ${WATER + 16} v18 M180 ${WATER + 16} v18`" stroke="#6e4528" stroke-opacity=".6" stroke-width="1.5" />
      </g>

      <!-- line -->
      <path :d="line" fill="none" stroke="#2c3346" stroke-opacity=".75" stroke-width="1.2" />

      <!-- bobber -->
      <g v-if="bobber.on" :transform="`translate(${bobber.x} ${bobber.y})`">
        <circle r="8" fill="#fff" stroke="#2c3346" stroke-opacity=".5" />
        <path d="M-8 0 A8 8 0 0 1 8 0Z" fill="#e20074" />
      </g>

      <!-- rod: graphite with a magenta grip -->
      <g stroke-linecap="round">
        <line :x1="PIVOT.x" :y1="PIVOT.y" :x2="tip.x" :y2="tip.y" stroke="#2a2f3b" stroke-width="5" />
        <line :x1="PIVOT.x" :y1="PIVOT.y" :x2="PIVOT.x + (tip.x - PIVOT.x) * 0.18" :y2="PIVOT.y + (tip.y - PIVOT.y) * 0.18" stroke="#e20074" stroke-width="8" />
        <circle :cx="PIVOT.x + (tip.x - PIVOT.x) * 0.22" :cy="PIVOT.y + (tip.y - PIVOT.y) * 0.22" r="7" fill="#c9ced8" stroke="#6b7180" stroke-width="1.5" />
      </g>

      <!-- hook + fish above the water -->
      <path v-if="hook.y <= WATER" :d="`M${hook.x} ${hook.y} c0 9 -8 11 -8 4`" fill="none" stroke="#3a4152" stroke-width="2" stroke-linecap="round" />
      <g v-if="fish.on && !fish.free && hook.y <= WATER" :transform="`translate(${hook.x} ${hook.y + 32}) rotate(${90 + fish.tilt})`">
        <path d="M30 0 L50 -14 L45 0 L50 14Z" fill="#a8005c" />
        <path :d="FISH" fill="url(#ci-fish)" stroke="#8f004d" stroke-width="1.2" />
        <path d="M-6 -10 q-7 10 0 20" fill="none" stroke="#ffd1e8" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" />
        <circle cx="-20" cy="-4" r="3" fill="#1d2233" /><circle cx="-21" cy="-5" r="1" fill="#fff" />
      </g>
      <!-- free fish swimming off -->
      <g v-if="fish.free" :transform="`translate(${fish.x} ${fish.y}) rotate(-12) scale(-1 1)`">
        <path d="M30 0 L50 -14 L45 0 L50 14Z" fill="#a8005c" />
        <path :d="FISH" fill="url(#ci-fish)" stroke="#8f004d" stroke-width="1.2" />
        <circle cx="-20" cy="-4" r="3" fill="#1d2233" />
      </g>

      <!-- splashes: thin rings and droplets -->
      <g v-for="s in splashes" :key="s.id" :transform="`translate(${s.x} ${WATER})`">
        <ellipse rx="26" ry="6" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.5" class="cast__ring" />
        <ellipse rx="26" ry="6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" class="cast__ring cast__ring--2" />
        <circle v-for="d in 5" :key="d" r="2.5" fill="#fff" class="cast__drop" :style="{ '--dx': `${(d - 3) * 12}px`, '--dy': `${-26 - (d % 3) * 12}px` }" />
      </g>
    </svg>

    <p class="cast__tagline" :style="{ opacity: tagline, transform: `translateY(${(1 - tagline) * 8}px)` }" aria-hidden="true">Let's go phishing.</p>
    <p class="cast__hint" role="status" aria-live="polite">{{ hint }}</p>
    <button type="button" class="cast__skip" @click="skip">Skip intro <kbd>Esc</kbd></button>
  </div>
</template>

<style scoped>
.cast { position: fixed; inset: 0; z-index: -1; transition: opacity 120ms linear; }
.cast__scene { position: absolute; inset: 0; width: 100%; height: 100%; }
.cast__clouds { animation: ci-drift 16s ease-in-out infinite alternate; }
@keyframes ci-drift { to { transform: translateX(24px); } }
.cast__glints { animation: ci-glint 5s ease-in-out infinite alternate; }
@keyframes ci-glint { from { transform: translateX(0); opacity: .6; } to { transform: translateX(-18px); opacity: 1; } }
.cast__ring { animation: ci-ring .9s ease-out forwards; transform-box: fill-box; transform-origin: center; }
.cast__ring--2 { animation-delay: .14s; opacity: 0; }
@keyframes ci-ring { from { transform: scale(.25); opacity: 1; } to { transform: scale(2.2); opacity: 0; } }
.cast__drop { animation: ci-drop .7s cubic-bezier(.2, .7, .4, 1) forwards; }
@keyframes ci-drop {
  0% { transform: translate(0, 0); opacity: 1; }
  50% { transform: translate(calc(var(--dx) * .7), var(--dy)); opacity: 1; }
  100% { transform: translate(var(--dx), 6px); opacity: 0; }
}
.cast__tagline {
  position: absolute; left: 0; right: 0; top: 9vh; margin: 0; text-align: center; pointer-events: none;
  font-family: var(--f-ui); font-weight: 700; font-size: clamp(22px, 3vw, 36px); letter-spacing: .02em;
  color: #fff; text-shadow: 0 2px 12px rgba(10, 60, 120, .35);
}
.cast__hint {
  position: absolute; left: 0; right: 0; bottom: 13vh; margin: 0; text-align: center; pointer-events: none;
  font-family: var(--f-ui); font-weight: 600; font-size: 15px; color: #fff;
  text-shadow: 0 1px 6px rgba(10, 50, 100, .5);
  animation: ci-hint 1.6s ease-in-out infinite;
}
@keyframes ci-hint { 50% { opacity: .65; } }
.cast__skip {
  position: absolute; right: 20px; bottom: 18px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, .7); border: 1px solid rgba(18, 34, 74, .2);
  color: #12224a; font-family: var(--f-ui); font-weight: 700; font-size: 13px;
  backdrop-filter: blur(6px);
}
.cast__skip:hover { background: #fff; }
.cast__skip kbd { font-family: var(--f-mono); font-size: 11px; padding: 0 5px; border-radius: 4px; border: 1px solid rgba(18, 34, 74, .25); }
</style>
