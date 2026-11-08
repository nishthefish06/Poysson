<script setup lang="ts">
/**
 * Sparkles: little air bubbles that pop on the corners of a box.
 * Drop inside any position:relative element.
 *   corners: which corners get a star (default all four)
 *   size:    base star size in px
 *   color:   glow color (any CSS color / var)
 *   inset:   push stars inside the box (use when the parent has overflow:hidden)
 * Each star gets its own size, speed and delay so they never twinkle in sync.
 */
type Corner = 'tl' | 'tr' | 'bl' | 'br'
const props = withDefaults(
  defineProps<{ corners?: Corner[]; size?: number; color?: string; inset?: boolean }>(),
  { corners: () => ['tl', 'tr', 'bl', 'br'], size: 14, color: 'var(--c-cyan)', inset: false },
)

// Stable pseudo-random per instance, so stars differ between boxes without SSR mismatch.
const seed = Math.floor(Math.random() * 1000)
const stars = computed(() =>
  props.corners.map((c, i) => {
    const r = (n: number) => ((Math.sin(seed * 9.1 + i * 7.3 + n) + 1) / 2)
    return {
      corner: c,
      size: Math.round(props.size * (0.7 + r(1) * 0.6)),
      dur: (2.6 + r(2) * 2.4).toFixed(2) + 's',
      delay: (r(3) * 3.5).toFixed(2) + 's',
    }
  }),
)
</script>

<template>
  <span class="sparkles" :class="{ 'sparkles--inset': inset }" :style="{ '--sp': color }" aria-hidden="true">
    <svg
      v-for="s in stars" :key="s.corner" class="sparkle" :class="[`sparkle--${s.corner}`, 'sparkle--bubble']"
      :width="s.size" :height="s.size" viewBox="0 0 24 24"
      :style="{ animationDuration: s.dur, animationDelay: s.delay }"
    >
      <circle cx="12" cy="12" r="10" class="sparkle__bubble" />
      <ellipse cx="8.5" cy="8" rx="3" ry="2" transform="rotate(-35 8.5 8)" fill="#fff" />
    </svg>
  </span>
</template>

<style scoped>
.sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.sparkle {
  position: absolute;
  fill: #fff;
  filter: drop-shadow(0 0 3px #fff) drop-shadow(0 0 8px var(--sp)) drop-shadow(0 0 16px var(--sp));
  transform: scale(0);
  animation: sparkle 3.4s var(--ease-soft) infinite both;
}
/* centered on the corner point */
.sparkle--tl { top: 0; left: 0; translate: -50% -50%; }
.sparkle--tr { top: 0; right: 0; translate: 50% -50%; }
.sparkle--bl { bottom: 0; left: 0; translate: -50% 50%; }
.sparkle--br { bottom: 0; right: 0; translate: 50% 50%; }
.sparkles--inset .sparkle { translate: none; }
.sparkles--inset .sparkle--tl { top: 8px; left: 8px; }
.sparkles--inset .sparkle--tr { top: 8px; right: 8px; }
.sparkles--inset .sparkle--bl { bottom: 8px; left: 8px; }
.sparkles--inset .sparkle--br { bottom: 8px; right: 8px; }
.sparkle--bubble { filter: none; animation-name: bubble-bob; }
.sparkle__bubble { fill: rgba(200, 235, 255, .35); stroke: var(--ink); stroke-width: 1.8; }
@keyframes bubble-bob {
  0%, 100% { transform: scale(0) translateY(0); opacity: 0; }
  15% { transform: scale(1) translateY(0); opacity: 1; }
  70% { transform: scale(1.05) translateY(-10px); opacity: .9; }
  80% { transform: scale(1.4) translateY(-12px); opacity: 0; } /* pop */
}
@media (prefers-reduced-motion: reduce) { .sparkle { animation: none; transform: scale(.6); opacity: .7; } }
</style>
