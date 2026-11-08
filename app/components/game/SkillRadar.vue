<script setup lang="ts">
/** SkillRadar — 5-axis radar of mastery per threat vector. DYNAMIC: player.skills */
import { VECTORS, type VectorId } from '~/data/incidents'

const props = withDefaults(defineProps<{ skills: Record<VectorId, number>; size?: number; compare?: Record<VectorId, number> }>(), { size: 300 })
const cx = 150
const cy = 150
const R = 105
const pt = (i: number, v: number) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / VECTORS.length
  return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]
}
const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ')
const shape = computed(() => poly(VECTORS.map(v => props.skills[v.id] ?? 0)))
const cmp = computed(() => props.compare ? poly(VECTORS.map(v => props.compare![v.id] ?? 0)) : '')
const rings = [25, 50, 75, 100]
</script>

<template>
  <svg class="skill-radar" :width="size" :height="size" viewBox="0 0 300 300" role="img" aria-label="Skill radar">
    <defs>
      <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="var(--c-magenta)" stop-opacity=".15" />
        <stop offset="100%" stop-color="var(--c-cyan)" stop-opacity=".45" />
      </radialGradient>
    </defs>
    <polygon v-for="r in rings" :key="r" :points="poly(VECTORS.map(() => r))" class="skill-radar__ring" />
    <line v-for="(v, i) in VECTORS" :key="v.id" :x1="cx" :y1="cy" :x2="pt(i, 100)[0]" :y2="pt(i, 100)[1]" class="skill-radar__axis" />
    <polygon v-if="cmp" :points="cmp" class="skill-radar__compare" />
    <polygon :points="shape" class="skill-radar__shape" fill="url(#radar-fill)" />
    <g v-for="(v, i) in VECTORS" :key="v.id + 'p'">
      <circle :cx="pt(i, skills[v.id])[0]" :cy="pt(i, skills[v.id])[1]" r="4" class="skill-radar__pt" />
      <text :x="pt(i, 128)[0]" :y="pt(i, 128)[1] - 4" class="skill-radar__lbl" text-anchor="middle">{{ v.code }}</text>
      <text :x="pt(i, 128)[0]" :y="pt(i, 128)[1] + 10" class="skill-radar__val" text-anchor="middle">{{ skills[v.id] }}</text>
    </g>
  </svg>
</template>

<style scoped>
.skill-radar { overflow: visible; max-width: 100%; height: auto; }
.skill-radar__ring { fill: none; stroke: var(--c-line); stroke-width: 1; }
.skill-radar__axis { stroke: var(--c-line); stroke-dasharray: 2 4; }
.skill-radar__shape { stroke: var(--c-cyan); stroke-width: 2; filter: drop-shadow(0 0 8px var(--c-cyan)); transition: all 600ms var(--ease); }
.skill-radar__compare { fill: none; stroke: var(--c-magenta); stroke-width: 1.5; stroke-dasharray: 4 3; }
.skill-radar__pt { fill: var(--c-bg-0); stroke: var(--c-cyan); stroke-width: 2; }
.skill-radar__lbl { font-family: var(--f-display); font-size: 11px; font-weight: 700; fill: var(--c-text); letter-spacing: .1em; }
.skill-radar__val { font-family: var(--f-mono); font-size: 10px; fill: var(--c-cyan); }
</style>
