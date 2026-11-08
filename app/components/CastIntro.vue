<script setup lang="ts">
/*
 * CastIntro: the "let's go phishing" opener shown on the way into the dashboard.
 * Rod winds back and casts, the hook splashes down, the bobber bites twice,
 * the rod yanks and a magenta fish comes up on the hook. Click / Esc skips.
 * Driven by one requestAnimationFrame timeline (seconds), so every piece stays attached to the line.
 */
const show = useState<boolean>('castIntro', () => false)

const WATER = 330
const PIVOT = { x: 190, y: 352 }
const ROD = 290
const SPLASH = { x: 700, y: WATER }
const END = 4.7 // seconds until the wipe-out starts

const t = ref(0)
const leaving = ref(false)
const splashes = ref<{ id: number; x: number; at: number }[]>([])
let raf = 0
let t0 = 0
let splashed1 = false
let splashed2 = false

/* ---- easing + keyframe helpers ---- */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeOut = (x: number) => 1 - (1 - x) ** 3
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const lerp = (a: number, b: number, x: number) => a + (b - a) * x
/** piecewise: [[time, value, ease?], ...] */
function track(keys: [number, number, ((x: number) => number)?][], time: number) {
  if (time <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [tb, vb, ez] = keys[i]
    const [ta, va] = keys[i - 1]
    if (time <= tb) return lerp(va, vb, (ez ?? easeInOut)(clamp((time - ta) / (tb - ta))))
  }
  return keys[keys.length - 1][1]
}

/* ---- the scene, derived from t ---- */
const angle = computed(() => {
  const time = t.value
  const base = track([
    [0, 62], [0.45, 118], [0.85, 32, easeOut], [2.25, 32], [2.32, 25], [2.42, 32], [2.5, 24], [2.6, 31],
    [2.7, 31], [3.15, 80, easeOut],
  ], time)
  return base + (time > 3.15 ? Math.sin(time * 5) * 2 : 0)
})
const tip = computed(() => {
  const a = (angle.value * Math.PI) / 180
  return { x: PIVOT.x + Math.cos(a) * ROD, y: PIVOT.y - Math.sin(a) * ROD }
})
const RELEASE = 0.72
const LAND = 1.5
const YANK = 2.7
const UP = 3.25
const releaseTip = { x: PIVOT.x + Math.cos((50 * Math.PI) / 180) * ROD, y: PIVOT.y - Math.sin((50 * Math.PI) / 180) * ROD }

const hook = computed(() => {
  const time = t.value
  const tp = tip.value
  if (time < RELEASE) {
    // dangling from the tip, swinging as the rod winds
    return { x: tp.x + Math.sin(time * 9) * 14, y: tp.y + 55 }
  }
  if (time < LAND) {
    // flight: parabola from the tip to the splash point
    const x = easeOut(clamp((time - RELEASE) / (LAND - RELEASE)))
    const sx = releaseTip.x
    const sy = releaseTip.y + 55
    return { x: lerp(sx, SPLASH.x, x), y: lerp(sy, SPLASH.y, x) - Math.sin(x * Math.PI) * 190 }
  }
  if (time < YANK) {
    // sinking, then waiting with a little drift
    const sink = easeOut(clamp((time - LAND) / 0.5))
    return { x: SPLASH.x + 6 + Math.sin(time * 2) * 4, y: lerp(WATER, WATER + 80, sink) }
  }
  // yank: up out of the water to hang under the tip, then swing
  const up = easeOut(clamp((time - YANK) / (UP - YANK)))
  const hang = { x: tp.x + Math.sin(time * 4.5) * 22, y: tp.y + 120 }
  return { x: lerp(SPLASH.x + 6, hang.x, up), y: lerp(WATER + 80, hang.y, up) }
})
const bobberOn = computed(() => t.value >= LAND && t.value < YANK + 0.08)
const bobber = computed(() => {
  const time = t.value
  let dip = 0
  if (time > 2.25 && time < 2.65) dip = Math.max(0, Math.sin((time - 2.25) * 16)) * 14
  return { x: SPLASH.x - 30, y: WATER - 4 + Math.sin(time * 3) * 2 + dip }
})
const fishOn = computed(() => t.value >= YANK - 0.15)
const fishTilt = computed(() => (t.value > UP ? Math.sin(t.value * 11) * 18 : Math.sin(t.value * 6) * 6))
const textOn = computed(() => t.value >= 3.1)

const line = computed(() => {
  const tp = tip.value
  const h = hook.value
  if (bobberOn.value && t.value >= LAND) {
    const b = bobber.value
    const mx = (tp.x + b.x) / 2
    const my = Math.max(tp.y, b.y) + 40
    return `M${tp.x} ${tp.y} Q${mx} ${my} ${b.x} ${b.y} L${h.x} ${h.y}`
  }
  if (t.value >= RELEASE && t.value < LAND) {
    const mx = (tp.x + h.x) / 2
    const my = (tp.y + h.y) / 2 + 30
    return `M${tp.x} ${tp.y} Q${mx} ${my} ${h.x} ${h.y}`
  }
  return `M${tp.x} ${tp.y} L${h.x} ${h.y}`
})

/* ---- loop ---- */
function frame(now: number) {
  if (!t0) t0 = now
  t.value = (now - t0) / 1000
  if (!splashed1 && t.value >= LAND) { splashed1 = true; splash(SPLASH.x) }
  if (!splashed2 && t.value >= YANK + 0.22) { splashed2 = true; splash(SPLASH.x - 10) }
  if (t.value >= END && !leaving.value) leave()
  if (!leaving.value || t.value < END + 0.8) raf = requestAnimationFrame(frame)
}
let sid = 0
function splash(x: number) {
  splashes.value.push({ id: ++sid, x, at: t.value })
}
function leave() {
  if (leaving.value) return
  leaving.value = true
  setTimeout(() => { show.value = false }, 650)
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave() }

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    t.value = 3.6 // show the catch, no motion
    setTimeout(leave, 1400)
  } else {
    raf = requestAnimationFrame(frame)
  }
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})

const FISH = `M-34 0 Q-20 -15 2 -14 Q22 -12 30 0 Q22 12 2 14 Q-20 15 -34 0Z`
</script>

<template>
  <div class="cast" :class="{ 'is-leaving': leaving }" role="dialog" aria-label="Let's go phishing" @click="leave">
    <svg class="cast__scene" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="cast-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fe2ff" /><stop offset="1" stop-color="#d9f4ff" />
        </linearGradient>
        <linearGradient id="cast-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3fb8ff" stop-opacity=".78" /><stop offset="1" stop-color="#1478d8" stop-opacity=".95" />
        </linearGradient>
      </defs>

      <!-- sky -->
      <rect width="1000" :height="WATER" fill="url(#cast-sky)" />
      <circle cx="840" cy="90" r="46" fill="#ffd54a" stroke="#12224a" stroke-width="4" />
      <g class="cast__cloud" fill="#fff" stroke="#12224a" stroke-width="4" stroke-linejoin="round">
        <path d="M120 120 q0 -30 34 -30 q10 -26 44 -18 q26 -18 48 6 q34 0 30 30 Z" />
      </g>
      <g class="cast__cloud cast__cloud--2" fill="#fff" stroke="#12224a" stroke-width="4" stroke-linejoin="round">
        <path d="M520 80 q0 -24 28 -24 q10 -22 38 -14 q22 -14 40 6 q28 0 24 26 Z" />
      </g>

      <!-- underwater things (drawn before the water so it tints them) -->
      <g v-if="!fishOn || hook.y > WATER">
        <path d="M0 0 c0 10 -9 12 -9 4" :transform="`translate(${hook.x} ${hook.y})`" fill="none" stroke="#12224a" stroke-width="3.5" stroke-linecap="round" />
      </g>
      <g v-if="fishOn && hook.y > WATER" :transform="`translate(${hook.x} ${hook.y + 32}) rotate(${90 + fishTilt})`">
        <path :d="FISH" fill="#e20074" stroke="#12224a" stroke-width="3.5" />
      </g>

      <!-- sea -->
      <rect :y="WATER" width="1000" :height="600 - WATER" fill="url(#cast-sea)" />
      <path class="cast__waves" :d="`M-40 ${WATER} q25 -12 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0`" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />

      <!-- dock -->
      <g stroke="#12224a" stroke-width="4" stroke-linejoin="round">
        <rect x="-10" :y="WATER + 18" width="270" height="26" fill="#c98b4f" />
        <rect x="40" :y="WATER + 44" width="18" height="90" fill="#8a5a2b" />
        <rect x="190" :y="WATER + 44" width="18" height="90" fill="#8a5a2b" />
        <path :d="`M60 ${WATER + 18} v26 M120 ${WATER + 18} v26 M180 ${WATER + 18} v26`" fill="none" stroke-width="2.5" />
      </g>

      <!-- fishing line -->
      <path :d="line" fill="none" stroke="#12224a" stroke-width="2" />

      <!-- bobber -->
      <g v-if="bobberOn" :transform="`translate(${bobber.x} ${bobber.y})`" stroke="#12224a" stroke-width="3">
        <circle r="11" fill="#fff" />
        <path d="M-11 0 A11 11 0 0 1 11 0 Z" fill="#e20074" />
      </g>

      <!-- rod (on top of the dock) -->
      <g stroke-linecap="round">
        <line :x1="PIVOT.x" :y1="PIVOT.y" :x2="tip.x" :y2="tip.y" stroke="#12224a" stroke-width="11" />
        <line :x1="PIVOT.x" :y1="PIVOT.y" :x2="tip.x" :y2="tip.y" stroke="#e20074" stroke-width="6" />
        <circle :cx="PIVOT.x + (tip.x - PIVOT.x) * 0.12" :cy="PIVOT.y + (tip.y - PIVOT.y) * 0.12" r="11" fill="#ffd54a" stroke="#12224a" stroke-width="4" />
      </g>

      <!-- hook + fish above water -->
      <g v-if="fishOn && hook.y <= WATER" :transform="`translate(${hook.x} ${hook.y})`">
        <path d="M0 0 c0 10 -9 12 -9 4" fill="none" stroke="#12224a" stroke-width="3.5" stroke-linecap="round" />
        <g :transform="`translate(0 32) rotate(${90 + fishTilt})`">
          <path d="M30 0 L52 -16 L46 0 L52 16Z" fill="#b3005c" stroke="#12224a" stroke-width="3.5" stroke-linejoin="round" />
          <path :d="FISH" fill="#e20074" stroke="#12224a" stroke-width="3.5" />
          <path d="M-6 -11 q-8 11 0 22" fill="none" stroke="#ffd1e8" stroke-width="3" stroke-linecap="round" />
          <circle cx="-20" cy="-4" r="4" fill="#12224a" /><circle cx="-21.5" cy="-5.5" r="1.4" fill="#fff" />
        </g>
      </g>
      <g v-else-if="!fishOn && hook.y <= WATER" :transform="`translate(${hook.x} ${hook.y})`">
        <path d="M0 0 c0 10 -9 12 -9 4" fill="none" stroke="#12224a" stroke-width="3.5" stroke-linecap="round" />
      </g>

      <!-- splashes -->
      <g v-for="s in splashes" :key="s.id" class="cast__splash" :transform="`translate(${s.x} ${WATER})`">
        <ellipse rx="30" ry="8" fill="none" stroke="#fff" stroke-width="4" class="cast__ring" />
        <ellipse rx="30" ry="8" fill="none" stroke="#fff" stroke-width="3" class="cast__ring cast__ring--2" />
        <circle v-for="d in 6" :key="d" r="5" fill="#fff" stroke="#12224a" stroke-width="2" class="cast__drop" :style="{ '--dx': `${(d - 3.5) * 16}px`, '--dy': `${-40 - (d % 3) * 18}px` }" />
      </g>
    </svg>

    <div v-if="textOn" class="cast__title">
      <span class="cast__title-text">Let's go phishing!</span>
    </div>
    <div class="cast__skip">click to skip</div>
  </div>
</template>

<style scoped>
.cast {
  position: fixed; inset: 0; z-index: 200;
  background: #bfeaff;
  display: grid; place-items: center;
  overflow: hidden;
  transition: clip-path 600ms cubic-bezier(.6, 0, .3, 1), opacity 600ms;
  clip-path: circle(150% at 50% 50%);
}
.cast.is-leaving { clip-path: circle(0% at 50% 60%); }
.cast__scene { position: absolute; inset: 0; width: 100%; height: 100%; }
.cast__cloud { animation: drift-cloud 9s ease-in-out infinite alternate; }
.cast__cloud--2 { animation-duration: 12s; }
.cast__waves { animation: wave-slide 2.4s linear infinite; }
@keyframes drift-cloud { to { transform: translateX(30px); } }
@keyframes wave-slide { to { transform: translateX(-50px); } }

.cast__ring { animation: ring .9s ease-out forwards; transform-box: fill-box; transform-origin: center; }
.cast__ring--2 { animation-delay: .15s; opacity: 0; }
@keyframes ring { from { transform: scale(.2); opacity: 1; } to { transform: scale(2.4); opacity: 0; } }
.cast__drop { animation: drop .8s cubic-bezier(.2, .7, .4, 1) forwards; }
@keyframes drop {
  0% { transform: translate(0, 0) scale(.6); opacity: 1; }
  50% { transform: translate(calc(var(--dx) * .7), var(--dy)) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), 10px) scale(.4); opacity: 0; }
}

.cast__title {
  position: absolute; top: 14%; left: 50%; translate: -50% 0;
  animation: pop-in .6s cubic-bezier(.3, 1.8, .5, 1) both;
}
.cast__title-text {
  display: inline-block;
  font-family: var(--f-display); font-weight: 700; font-size: clamp(36px, 7vw, 84px);
  color: var(--c-magenta);
  -webkit-text-stroke: 3px var(--ink); paint-order: stroke fill;
  text-shadow: 5px 6px 0 var(--ink);
  white-space: nowrap;
  animation: title-wobble 1.6s ease-in-out .6s infinite;
}
@keyframes pop-in { from { transform: scale(.2) rotate(-12deg); opacity: 0; } to { transform: scale(1) rotate(-3deg); opacity: 1; } }
@keyframes title-wobble { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(2deg) scale(1.03); } }
.cast__skip { position: absolute; bottom: 18px; right: 22px; font-family: var(--f-hand); font-size: 20px; font-weight: 700; color: #fff; text-shadow: 0 2px 0 var(--ink); opacity: .9; }
</style>
