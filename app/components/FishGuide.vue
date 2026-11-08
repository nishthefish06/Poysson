<script setup lang="ts">
/*
 * FishGuide: a magenta fish that trails a little behind the real cursor (the system cursor stays),
 * and on the sign-in pages guides you: it swims to the focused field and looks at it, covers its
 * eyes for the password, circles the button while loading, pings sonar while waiting for the code,
 * shakes its head at a wrong answer, and loops then dashes through the card on success.
 *
 *  - touch devices: no cursor fish; it parks in a corner (and still swims to focused fields)
 *  - prefers-reduced-motion: parked, snaps instead of swimming, no loop
 *  - hidden tab: the animation loop stops
 * In High Stakes the guide is a charged ace of hearts instead of a fish: it flips face down
 * instead of covering its eyes, tilts toward what it "looks" at, and throws sparks, not bubbles.
 * Moods / targets come from useFishGuide(). Movement is one rAF loop writing transforms directly.
 */
const { state } = useFishGuide()
const route = useRoute()
const { isStakes } = useTheme()
const AUTH_PAGES = ['/login', '/verify', '/enroll']
const onAuth = computed(() => AUTH_PAGES.includes(route.path))
// In High Stakes the fish only appears on the sign-in pages (the app itself uses cards).
const visible = computed(() => !isStakes.value || onAuth.value)

const root = ref<HTMLElement>()
const facing = ref<1 | -1>(1)
// guide size: a landscape fish, or a portrait card
const dims = computed(() => (isStakes.value ? { w: 34, h: 46 } : { w: 58, h: 40 }))
let W = 58
let H = 40
watch(dims, d => { W = d.w; H = d.h }, { immediate: true })

let touch: MediaQueryList | undefined
let reduced: MediaQueryList | undefined
const pos = { x: -200, y: -200 }
const pointer = { x: 0, y: 0, seen: false }
let rot = 0
let raf = 0
let last = 0
let successAt = -1
let successFrom = { x: 0, y: 0 }

const parked = () => ({ x: window.innerWidth - 64, y: window.innerHeight - 58 })
const isTouch = () => !!touch?.matches
const isReduced = () => !!reduced?.matches

function targetRect(): DOMRect | null {
  const el = state.target
  if (!el || !el.isConnected) return null
  const r = el.getBoundingClientRect()
  return r.width || r.height ? r : null
}

/** Where the fish wants to be this frame, and what it looks at. */
function aim(now: number): { x: number; y: number; look: { x: number; y: number }; snap?: boolean; rot?: number } {
  // success: a quick loop where it is, then a dash through the card and off to the right
  if (state.mood === 'success' && successAt >= 0 && !isReduced()) {
    const t = (now - successAt) / 1000
    if (t < 0.6) {
      const th = (t / 0.6) * Math.PI * 2
      return { x: successFrom.x + Math.sin(th) * 30 * facing.value, y: successFrom.y - (1 - Math.cos(th)) * 30, look: { x: facing.value, y: 0 }, snap: true, rot: -th * (180 / Math.PI) * facing.value }
    }
    const card = document.querySelector('.auth__card')?.getBoundingClientRect()
    const mid = card ? { x: card.left + card.width / 2, y: card.top + card.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const end = { x: window.innerWidth + 140, y: mid.y - 40 }
    const u = Math.min(1, (t - 0.6) / 0.9)
    const p = u < 0.5
      ? { x: successFrom.x + (mid.x - successFrom.x) * (u / 0.5), y: successFrom.y + (mid.y - successFrom.y) * (u / 0.5) }
      : { x: mid.x + (end.x - mid.x) * ((u - 0.5) / 0.5), y: mid.y + (end.y - mid.y) * ((u - 0.5) / 0.5) }
    return { ...p, look: { x: 1, y: 0 }, snap: true }
  }

  const r = targetRect()
  if (r) {
    const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    if (state.mood === 'loading' && !isReduced()) {
      const a = now / 1000 * 3.2
      return { x: c.x + Math.cos(a) * (r.width / 2 + 26), y: c.y + Math.sin(a) * (r.height / 2 + 22), look: { x: -Math.sin(a), y: Math.cos(a) } }
    }
    // beside the field (right side if there is room), looking at it
    const right = r.right + 40 + W / 2 < window.innerWidth
    const x = right ? r.right + 40 : r.left - 40
    return { x, y: c.y, look: { x: right ? -1 : 1, y: 0 } }
  }

  if (isTouch() || isReduced() || !pointer.seen) {
    const p = parked()
    return { ...p, look: { x: -0.6, y: -0.4 }, snap: isReduced() }
  }
  // trail a little behind and below-right of the cursor, looking at it
  const tx = pointer.x + 26
  const ty = pointer.y + 24
  return { x: tx, y: ty, look: { x: pointer.x - pos.x, y: pointer.y - pos.y } }
}

function frame(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
  last = now
  const a = aim(now)
  const k = state.target ? 7 : 10 // trailing stiffness (lower = lazier)
  const f = a.snap || isReduced() ? 1 : 1 - Math.exp(-dt * k)
  const vx = (a.x - pos.x) * f
  pos.x += vx
  pos.y += (a.y - pos.y) * f

  // face the way we look (target) or the way we swim (cursor), with a little hysteresis
  if (state.target || state.mood === 'success') {
    if (Math.abs(a.look.x) > 0.2) facing.value = a.look.x > 0 ? 1 : -1
  } else if (Math.abs(vx) > 0.6) {
    facing.value = vx > 0 ? 1 : -1
  }
  const tilt = a.rot ?? Math.max(-18, Math.min(18, (a.y - pos.y) * 0.4))
  rot += (tilt - rot) * (a.rot !== undefined ? 1 : 0.15)

  // pupils: unit direction toward what we look at, in the fish's own (flipped) space
  const len = Math.hypot(a.look.x, a.look.y) || 1
  const lx = (a.look.x / len) * facing.value * 1.8
  const ly = (a.look.y / len) * 1.6

  const el = root.value
  if (el) {
    el.style.transform = `translate3d(${pos.x - W / 2}px, ${pos.y - H / 2}px, 0) rotate(${rot}deg)`
    el.style.setProperty('--lx', `${lx}px`)
    el.style.setProperty('--ly', `${ly}px`)
    el.style.setProperty('--lk', String(a.look.x / len)) // -1..1, the card tilts toward its target (never mirrored)
  }
  raf = requestAnimationFrame(frame)
}

function start() {
  if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame) }
}
function stopLoop() {
  cancelAnimationFrame(raf)
  raf = 0
}
function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
  pointer.x = e.clientX
  pointer.y = e.clientY
  if (!pointer.seen) {
    pointer.seen = true
    if (pos.x < -100) { pos.x = e.clientX + 26; pos.y = e.clientY + 24 }
  }
}
function onVisibility() {
  if (document.hidden) stopLoop()
  else start()
}

watch(() => state.successes, () => {
  successAt = performance.now()
  successFrom = { x: pos.x, y: pos.y }
})

onMounted(() => {
  touch = matchMedia('(hover: none), (pointer: coarse)')
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const p = parked()
  pos.x = p.x
  pos.y = p.y
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  start()
})
onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('pointermove', onMove)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div
    v-show="visible" ref="root" class="fishguide" :class="[`is-${state.mood}`, { 'is-card': isStakes }]"
    :style="{ width: `${dims.w}px`, height: `${dims.h}px` }" aria-hidden="true"
  >
    <span v-if="state.mood === 'sonar'" class="fishguide__sonar" />
    <span v-if="state.mood === 'sonar'" class="fishguide__sonar fishguide__sonar--2" />
    <div class="fishguide__flip" :style="{ transform: isStakes ? 'none' : `scaleX(${facing})` }">
      <!-- High Stakes: the ace of hearts -->
      <div v-if="isStakes" class="fishguide__card">
        <div class="fishguide__card-in">
          <div class="fishguide__face fishguide__face--front">
            <span class="fishguide__idx">A<br>♥</span>
            <span class="fishguide__pip">♥</span>
          </div>
          <div class="fishguide__face fishguide__face--back" />
        </div>
      </div>
      <svg v-else class="fishguide__fish" viewBox="0 0 64 44" width="58" height="40">
        <g class="fishguide__tail"><path d="M15 22 L2 9 L6 22 L2 35Z" fill="#b3005c" stroke="#12224a" stroke-width="2" stroke-linejoin="round" /></g>
        <path d="M27 10 Q35 0 43 9Z" fill="#b3005c" stroke="#12224a" stroke-width="2" stroke-linejoin="round" />
        <ellipse cx="35" cy="22" rx="22" ry="14" fill="#e20074" stroke="#12224a" stroke-width="2.2" />
        <path d="M30 11 q-6 11 0 22" fill="none" stroke="#ffd1e8" stroke-width="2.4" stroke-linecap="round" />
        <ellipse cx="34" cy="28" rx="11" ry="4" fill="#ffd1e8" opacity=".35" />
        <path class="fishguide__mouth" d="M54 26 q2.5 2 5 0" fill="none" stroke="#12224a" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="47" cy="18" r="6.5" fill="#fff" stroke="#12224a" stroke-width="2" />
        <circle class="fishguide__pupil" cx="47" cy="18" r="3.2" fill="#12224a" />
        <!-- the fin that covers its eye for the password -->
        <path class="fishguide__fin" d="M36 25 q8 2 12 9 q-9 0 -13 -5Z" fill="#ff5aa8" stroke="#12224a" stroke-width="1.8" stroke-linejoin="round" />
      </svg>
    </div>
    <template v-if="state.mood === 'shake'">
      <span v-for="b in 3" :key="`${state.shakes}-${b}`" class="fishguide__bubble" :style="{ '--i': b }" />
    </template>
  </div>
</template>

<style scoped>
.fishguide {
  position: fixed; left: 0; top: 0; z-index: 210;
  width: 58px; height: 40px;
  pointer-events: none;
  will-change: transform;
  filter: drop-shadow(2px 3px 0 rgba(18, 34, 74, .25));
}
.fishguide__flip { width: 100%; height: 100%; transition: transform 180ms ease; }
.fishguide__fish { display: block; overflow: visible; }
.fishguide__tail { transform-origin: 15px 22px; animation: fg-tail .38s ease-in-out infinite alternate; }
.is-loading .fishguide__tail { animation-duration: .18s; }
@keyframes fg-tail { from { transform: rotate(-12deg); } to { transform: rotate(12deg); } }

/* eyes follow what the fish looks at */
.fishguide__pupil { transform: translate(var(--lx, 0), var(--ly, 0)); transition: transform 120ms ease-out; }

/* the fin: resting by the belly, over the eye (cover), or half down (peek) */
.fishguide__fin { transform-box: view-box; transform-origin: 38px 26px; transition: transform 240ms cubic-bezier(.3, 1.4, .5, 1); }
.is-cover .fishguide__fin { transform: translate(6px, -12px) rotate(-38deg) scale(1.25); }
.is-peek .fishguide__fin { transform: translate(7px, -4px) rotate(-18deg) scale(1.15); }
.is-cover .fishguide__pupil { opacity: 0; }

/* wrong answer: head shake + frown */
.is-shake .fishguide__fish { animation: fg-shake .5s ease-in-out 1; }
.is-shake .fishguide__mouth { transform: translate(0, 3px) scaleY(-1); transform-box: fill-box; transform-origin: center; }
@keyframes fg-shake { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-16deg); } 45% { transform: rotate(14deg); } 70% { transform: rotate(-9deg); } }
.fishguide__bubble {
  position: absolute; right: -2px; top: 6px; width: 9px; height: 9px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(18, 34, 74, .4);
  animation: fg-bubble .8s ease-out calc(var(--i) * 90ms) both;
}
@keyframes fg-bubble {
  0% { transform: translate(0, 0) scale(.4); opacity: 0; }
  30% { opacity: 1; }
  80% { transform: translate(calc(var(--i) * 6px), -34px) scale(1); opacity: 1; }
  100% { transform: translate(calc(var(--i) * 6px), -40px) scale(1.6); opacity: 0; } /* pop */
}

/* waiting for the code: sonar */
.fishguide__sonar {
  position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%;
  border: 2px solid var(--c-magenta);
  animation: fg-sonar 1.8s ease-out infinite;
}
.fishguide__sonar--2 { animation-delay: .9s; }
@keyframes fg-sonar { from { transform: scale(.4); opacity: .8; } to { transform: scale(2.4); opacity: 0; } }

.is-success .fishguide__tail { animation-duration: .12s; }

/* ---------- High Stakes: the charged ace ---------- */
.fishguide.is-card { filter: none; }
.fishguide__card { width: 100%; height: 100%; perspective: 300px; }
.fishguide__card-in {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d;
  transform: rotateY(calc(var(--lk, 0) * 22deg));
  transition: transform 380ms cubic-bezier(.3, 1.3, .5, 1);
}
/* password: face down; shown: tipped back up to peek */
.is-cover .fishguide__card-in { transform: rotateY(180deg); }
.is-peek .fishguide__card-in { transform: rotateY(150deg) rotateX(-28deg); }
.is-loading .fishguide__card-in { animation: fg-card-spin .7s linear infinite; }
.is-success .fishguide__card-in { animation: fg-card-spin .35s linear infinite; }
@keyframes fg-card-spin { to { transform: rotateY(360deg); } }
.is-card.is-shake .fishguide__card { animation: fg-shake .5s ease-in-out 1; }
.fishguide__face {
  position: absolute; inset: 0; border-radius: 5px; backface-visibility: hidden;
  box-shadow: 0 0 0 1px #ff2e88, 0 0 10px rgba(255, 46, 136, .8), 0 0 22px rgba(255, 46, 136, .4);
}
.fishguide__face--front {
  background: linear-gradient(160deg, #fbf4e8, #e9dcc6); color: #d4145a;
  font-family: Georgia, 'Times New Roman', serif; font-weight: 700;
}
.fishguide__idx { position: absolute; left: 4px; top: 3px; font-size: 9px; line-height: 1; text-align: center; }
.fishguide__pip { position: absolute; inset: 0; display: grid; place-items: center; font-size: 22px; }
.fishguide__face--back {
  transform: rotateY(180deg);
  border: 2px solid #f3eadb;
  background:
    repeating-linear-gradient(45deg, rgba(255, 46, 136, .55) 0 1.5px, transparent 1.5px 7px),
    repeating-linear-gradient(-45deg, rgba(255, 46, 136, .55) 0 1.5px, transparent 1.5px 7px),
    linear-gradient(160deg, #6e4128, #34211a);
}
/* charge pulses while it works */
.is-card.is-loading .fishguide__face, .is-card.is-sonar .fishguide__face { animation: fg-charge .9s ease-in-out infinite; }
@keyframes fg-charge { 50% { box-shadow: 0 0 0 1px #ffd1e6, 0 0 16px #ff2e88, 0 0 36px rgba(255, 46, 136, .7); } }
/* wrong answer: sparks instead of bubbles */
.is-card .fishguide__bubble { width: 5px; height: 5px; border: 0; background: #ffd1e6; box-shadow: 0 0 6px #ff2e88, 0 0 12px #ff2e88; right: 4px; top: 2px; }

@media (prefers-reduced-motion: reduce) {
  .fishguide__fin, .fishguide__pupil, .fishguide__flip, .fishguide__card-in { transition: none; }
}
</style>
