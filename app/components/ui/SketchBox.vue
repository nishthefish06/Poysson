<script setup lang="ts">
/**
 * SketchBox: a hand-drawn outline for its parent box.
 * Each side is its own slightly bowed ink stroke that overshoots (or falls short of)
 * the corner, so the lines never quite meet. A fainter second pass re-traces some sides.
 * While the parent is hovered the lines "boil" (redraw every few frames), like cel animation.
 *
 * Drop inside any position:relative element:  <SketchBox />  ·  <SketchBox color="var(--c-magenta)" :width="3" />
 */
const props = withDefaults(
  defineProps<{ color?: string; width?: number; overshoot?: number; boil?: boolean }>(),
  { color: 'var(--ink)', width: 2.2, overshoot: 9, boil: true },
)
const root = ref<SVGSVGElement>()
const w = ref(0)
const h = ref(0)
const seed = ref(Math.floor(Math.random() * 1e6))

// tiny seeded RNG so a box keeps its look until it boils
function rng(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const strokes = computed(() => {
  if (!w.value || !h.value) return []
  const r = rng(seed.value)
  const j = (a: number) => (r() * 2 - 1) * a
  const ov = () => -props.overshoot * 0.45 + r() * props.overshoot * 1.45 // <0 leaves a gap
  const W = w.value
  const H = h.value
  const bow = Math.min(3, Math.max(W, H) * 0.012)
  const side = (x1: number, y1: number, x2: number, y2: number, horiz: boolean) => {
    const a = ov()
    const b = ov()
    const sx = horiz ? x1 - a : x1 + j(1.2)
    const sy = horiz ? y1 + j(1.2) : y1 - a
    const ex = horiz ? x2 + b : x2 + j(1.2)
    const ey = horiz ? y2 + j(1.2) : y2 + b
    const mx = (sx + ex) / 2 + (horiz ? j(W * 0.08) : j(bow))
    const my = (sy + ey) / 2 + (horiz ? j(bow) : j(H * 0.08))
    return `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
  }
  const sides = [
    side(0, 0, W, 0, true),
    side(W, 0, W, H, false),
    side(0, H, W, H, true),
    side(0, 0, 0, H, false),
  ]
  // second, lighter pass on two random sides
  const extra = [0, 1, 2, 3].filter(() => r() < 0.5).slice(0, 2).map(i => {
    const [x1, y1, x2, y2, hz] = ([[0, 0, W, 0, true], [W, 0, W, H, false], [0, H, W, H, true], [0, 0, 0, H, false]] as const)[i]
    return side(x1, y1, x2, y2, hz)
  })
  return [...sides.map(d => ({ d, main: true })), ...extra.map(d => ({ d, main: false }))]
})

let ro: ResizeObserver | undefined
let parent: HTMLElement | null = null
let boilTimer: ReturnType<typeof setInterval> | undefined
const startBoil = () => {
  if (!props.boil || boilTimer || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  boilTimer = setInterval(() => { seed.value++ }, 130)
}
const stopBoil = () => { clearInterval(boilTimer); boilTimer = undefined }

onMounted(() => {
  const el = root.value
  if (!el) return
  ro = new ResizeObserver(([e]) => {
    w.value = e.contentRect.width
    h.value = e.contentRect.height
  })
  ro.observe(el)
  parent = el.parentElement
  parent?.addEventListener('pointerenter', startBoil)
  parent?.addEventListener('pointerleave', stopBoil)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  stopBoil()
  parent?.removeEventListener('pointerenter', startBoil)
  parent?.removeEventListener('pointerleave', stopBoil)
})
</script>

<template>
  <svg ref="root" class="sketch" aria-hidden="true">
    <path
      v-for="(s, i) in strokes" :key="i" :d="s.d"
      :stroke="color" :stroke-width="s.main ? width : width * 0.55" :opacity="s.main ? 1 : 0.45"
    />
  </svg>
</template>

<style scoped>
.sketch {
  position: absolute; inset: 0; width: 100%; height: 100%;
  overflow: visible; pointer-events: none; z-index: 1;
  fill: none; stroke-linecap: round;
}
</style>
