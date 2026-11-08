<script setup lang="ts">
/*
 * DealIntro: the High Stakes opener on the way into the dashboard.
 * Five cards (one per threat vector) are dealt into a fan and flip face up; the ace of hearts
 * rises, charges kinetic pink and detonates; "OUT OF TIME." glitches in over the flash;
 * then the picture collapses like an old CRT switching off. Click / Esc skips.
 * Pure CSS timeline: every step is an animation-delay.
 */
const show = useState<boolean>('castIntro', () => false)
const leaving = ref(false)

const HAND = [
  { r: 'K', s: '♠', red: false },
  { r: 'Q', s: '♦', red: true },
  { r: 'A', s: '♥', red: true, ace: true },
  { r: 'J', s: '♣', red: false },
  { r: '10', s: '♥', red: true },
]
const SHARDS = Array.from({ length: 14 }, (_, i) => ({ a: `${(i / 14) * 360 + Math.random() * 20}deg`, d: `${160 + Math.random() * 160}px` }))

let timer: ReturnType<typeof setTimeout> | undefined
function leave() {
  if (leaving.value) return
  leaving.value = true
  clearTimeout(timer)
  setTimeout(() => { show.value = false }, 700)
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave() }
onMounted(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  timer = setTimeout(leave, reduced ? 1600 : 4500)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="deal" :class="{ 'is-leaving': leaving }" role="dialog" aria-label="Out of time. Place your bets." @click="leave">
    <div class="deal__screen">
      <div class="deal__osd">
        <span class="deal__osd-play">PLAY ▶</span>
        <span>SP --:--</span>
      </div>

      <div class="deal__hand">
        <div
          v-for="(c, i) in HAND" :key="i" class="deal__slot" :class="{ 'is-ace': c.ace }"
          :style="{ '--i': i, '--o': i - 2 }"
        >
          <div class="deal__card">
            <div class="deal__face deal__face--back" />
            <div class="deal__face deal__face--front" :class="{ 'is-red': c.red }">
              <span class="deal__idx">{{ c.r }}<br>{{ c.s }}</span>
              <span class="deal__pip">{{ c.s }}</span>
              <span class="deal__idx deal__idx--b">{{ c.r }}<br>{{ c.s }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="deal__flash" />
      <div class="deal__ring" />
      <span v-for="(s, i) in SHARDS" :key="i" class="deal__shard" :style="{ '--a': s.a, '--d': s.d }" />

      <div class="deal__title">
        <h1 class="deal__big" data-text="OUT OF TIME.">OUT OF TIME.</h1>
        <p class="deal__sub">place your bets</p>
      </div>
      <div class="deal__skip">click to skip</div>
    </div>
  </div>
</template>

<style scoped>
.deal { position: fixed; inset: 0; z-index: 200; background: #000; }
.deal__screen {
  position: absolute; inset: 0; overflow: hidden;
  display: grid; place-items: center;
  background:
    radial-gradient(60% 50% at 50% 55%, rgba(31, 122, 72, .55), transparent 70%),
    radial-gradient(120% 90% at 50% 50%, #0f2a1d, #06090a 75%);
  transform-origin: 50% 50%;
}
/* CRT power-off: squash to a line, then to a dot */
.deal.is-leaving .deal__screen { animation: crt-off .65s cubic-bezier(.6, 0, .4, 1) forwards; }
@keyframes crt-off {
  0% { transform: scale(1, 1); filter: brightness(1); }
  45% { transform: scale(1, .006); filter: brightness(3); }
  100% { transform: scale(0, .006); filter: brightness(5); }
}
/* scanlines over the whole picture */
.deal__screen::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .28) 0 1px, transparent 1px 3px);
}

.deal__osd {
  position: absolute; left: 28px; top: 22px; display: flex; flex-direction: column;
  font-family: var(--f-vhs); font-size: 28px; line-height: 1; color: #f3eadb;
  text-shadow: 2px 0 rgba(255, 46, 136, .6), -2px 0 rgba(62, 224, 138, .5);
}
.deal__osd-play { animation: osd 1.2s steps(1) infinite; }
@keyframes osd { 60% { opacity: 0; } }

/* ---------- the hand ---------- */
.deal__hand { position: relative; width: 0; height: 0; }
.deal__slot {
  position: absolute; left: -55px; top: -78px; width: 110px; height: 156px;
  perspective: 900px;
  animation:
    deal .55s cubic-bezier(.2, .9, .3, 1.15) calc(var(--i) * .12s) both,
    fold .5s ease-in 2.05s forwards;
}
@keyframes deal {
  from { transform: translate(0, -70vh) rotate(-30deg); opacity: 0; }
  to { transform: translate(calc(var(--o) * 78px), calc(var(--o) * var(--o) * 9px)) rotate(calc(var(--o) * 11deg)); opacity: 1; }
}
/* the other cards drop out so the ace is alone */
@keyframes fold {
  to { transform: translate(calc(var(--o) * 150px), 60vh) rotate(calc(var(--o) * 40deg)); opacity: 0; }
}
.deal__slot.is-ace {
  z-index: 2;
  animation:
    deal .55s cubic-bezier(.2, .9, .3, 1.15) calc(var(--i) * .12s) both,
    rise .7s cubic-bezier(.2, .8, .3, 1) 2s forwards,
    blow .25s ease-in 2.85s forwards;
}
@keyframes rise {
  from { transform: translate(0, 0) rotate(0); }
  to { transform: translate(0, -30px) scale(1.25); }
}
@keyframes blow { to { transform: translate(0, -30px) scale(1.9); opacity: 0; filter: brightness(4); } }

.deal__card {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d;
  animation: flip .45s cubic-bezier(.3, .7, .3, 1) calc(1.05s + var(--i) * .13s) both;
}
@keyframes flip { from { transform: rotateY(0); } to { transform: rotateY(180deg); } }
.deal__face { position: absolute; inset: 0; border-radius: 10px; backface-visibility: hidden; box-shadow: 0 10px 24px rgba(0, 0, 0, .55); }
/* card back: leather brown with a pink diamond lattice */
.deal__face--back {
  border: 3px solid #f3eadb;
  background:
    repeating-linear-gradient(45deg, rgba(255, 46, 136, .55) 0 2px, transparent 2px 12px),
    repeating-linear-gradient(-45deg, rgba(255, 46, 136, .55) 0 2px, transparent 2px 12px),
    linear-gradient(160deg, #6e4128, #34211a);
}
.deal__face--front {
  transform: rotateY(180deg);
  background: linear-gradient(160deg, #fbf4e8, #e6d7bf);
  border: 1px solid rgba(0, 0, 0, .3);
  color: #1d1416;
  font-family: Georgia, 'Times New Roman', serif; font-weight: 700;
}
.deal__face--front.is-red { color: #d4145a; }
.deal__idx { position: absolute; left: 9px; top: 7px; font-size: 18px; line-height: 1; text-align: center; }
.deal__idx--b { left: auto; top: auto; right: 9px; bottom: 7px; transform: rotate(180deg); }
.deal__pip { position: absolute; inset: 0; display: grid; place-items: center; font-size: 58px; }
/* the ace charges up */
.is-ace .deal__face--front { animation: charge-card .16s steps(2) 2.1s 5 both, glow-card .8s ease-in 2.05s forwards; }
@keyframes charge-card { 50% { filter: brightness(1.4) drop-shadow(0 0 6px #fff); } }
@keyframes glow-card {
  to { box-shadow: 0 0 0 2px #ff2e88, 0 0 30px #ff2e88, 0 0 80px rgba(255, 46, 136, .8); border-color: #ffd1e6; }
}

/* ---------- detonation ---------- */
.deal__flash {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(circle at 50% 46%, #fff 0, #ffd1e6 12%, rgba(255, 46, 136, .8) 30%, transparent 65%);
  animation: flash .9s ease-out 2.9s both;
}
@keyframes flash { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }
.deal__ring {
  position: absolute; left: 50%; top: 46%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
  border: 4px solid #ffd1e6; box-shadow: 0 0 20px #ff2e88, inset 0 0 20px #ff2e88;
  opacity: 0; animation: ring .8s cubic-bezier(.1, .8, .3, 1) 2.92s both;
}
@keyframes ring { from { transform: scale(.2); opacity: 1; } to { transform: scale(7); opacity: 0; } }
.deal__shard {
  position: absolute; left: 50%; top: 46%; width: 6px; height: 22px; margin: -11px 0 0 -3px;
  background: linear-gradient(#fff, #ff2e88); border-radius: 3px; box-shadow: 0 0 10px #ff2e88;
  opacity: 0; animation: shard .9s cubic-bezier(.1, .7, .3, 1) 2.9s both;
}
@keyframes shard {
  from { transform: rotate(var(--a)) translateY(0); opacity: 1; }
  to { transform: rotate(var(--a)) translateY(calc(var(--d) * -1)); opacity: 0; }
}

/* ---------- title ---------- */
.deal__title { position: absolute; left: 0; right: 0; top: 50%; translate: 0 -50%; text-align: center; pointer-events: none; }
.deal__big {
  position: relative; display: inline-block;
  font-family: var(--f-display); font-weight: 400; font-size: clamp(44px, 9vw, 120px); letter-spacing: .06em;
  color: #f3eadb;
  text-shadow: -4px 0 rgba(255, 46, 136, .8), 4px 0 rgba(62, 224, 138, .6), 0 0 40px rgba(255, 46, 136, .5);
  animation: title-in .5s steps(4) 3.05s both;
}
/* a white streak through the title */
.deal__big::after {
  content: ''; position: absolute; top: -10%; bottom: -10%; left: 38%; width: 5%;
  background: rgba(255, 255, 255, .85); mix-blend-mode: overlay; transform: skewX(-18deg);
}
@keyframes title-in {
  0% { opacity: 0; transform: translateX(-12px) skewX(20deg); clip-path: inset(40% 0 40% 0); }
  50% { opacity: 1; transform: translateX(8px) skewX(-10deg); clip-path: inset(10% 0 30% 0); }
  100% { opacity: 1; transform: none; clip-path: inset(0); }
}
.deal__sub {
  margin-top: 4px;
  font-family: var(--f-hand); font-size: clamp(28px, 4vw, 48px); color: #ffcf3a;
  text-shadow: 0 0 10px rgba(255, 207, 58, .7), 0 0 30px rgba(255, 207, 58, .35);
  animation: sub-in .6s ease-out 3.45s both;
}
@keyframes sub-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.deal__skip { position: absolute; bottom: 18px; right: 22px; font-family: var(--f-vhs); font-size: 22px; color: rgba(243, 234, 219, .6); }

@media (prefers-reduced-motion: reduce) {
  .deal__slot, .deal__card, .deal__flash, .deal__ring, .deal__shard { display: none; }
  .deal__big, .deal__sub { animation: none; }
}
</style>
