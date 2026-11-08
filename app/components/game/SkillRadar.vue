<script setup lang="ts">
/**
 * SkillRadar: mastery per threat vector, drawn as a magenta starfish.
 * Each vector is a star tip; its distance from center is that skill.
 * The valleys between tips sit at a fixed fraction of the neighbouring tips,
 * so the shape always reads as a star, fat when skills are high and small when low.
 * DYNAMIC: player.skills
 */
import { VECTORS, type VectorId } from '~/data/incidents'

const props = withDefaults(defineProps<{ skills: Record<VectorId, number>; size?: number; compare?: Record<VectorId, number> }>(), { size: 300 })
const uid = `sr${Math.floor(Math.random() * 1e6)}`
const cx = 150
const cy = 150
const R = 108
// inner radius as a share of the tips around it; starfish arms are chunkier
const VALLEY_FISH = 0.52
const n = VECTORS.length
const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
const at = (a: number, r: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const
const tip = (i: number, v: number) => at(ang(i), R * (v / 100))

/** star polygon: tip, valley, tip, valley… */
const star = (vals: number[]) => {
  const pts: string[] = []
  vals.forEach((v, i) => {
    const next = vals[(i + 1) % n]
    pts.push(tip(i, v).join(','))
    const valley = VALLEY_FISH
    pts.push(at(ang(i) + Math.PI / n, R * valley * ((v + next) / 2 / 100)).join(','))
  })
  return pts.join(' ')
}
// Keep a tiny minimum so a brand-new player still sees a star, not a dot.
const vals = computed(() => VECTORS.map(v => Math.max(8, props.skills[v.id] ?? 0)))
const shape = computed(() => star(vals.value))
const cmp = computed(() => (props.compare ? star(VECTORS.map(v => Math.max(8, props.compare![v.id] ?? 0))) : ''))
const rings = [25, 50, 75, 100]
const SPARK = 'M0-7C.4-2.6 2.6-.4 7 0 2.6.4.4 2.6 0 7-.4 2.6-2.6.4-7 0-2.6-.4-.4-2.6 0-7Z'
</script>

<template>
  <svg class="skill-radar" :width="size" :height="size" viewBox="0 0 300 300" role="img" aria-label="Skill star: mastery per threat vector">
    <defs>
      <!-- starfish: warm coral body, sandy middle -->
      <radialGradient :id="`${uid}-fill`" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#ffc2e0" />
        <stop offset="45%" stop-color="#ff4fa8" />
        <stop offset="100%" stop-color="#e20074" />
      </radialGradient>
      <pattern :id="`${uid}-dots`" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx="4.5" cy="4.5" r="1.6" fill="#fff" opacity=".75" />
      </pattern>
      <linearGradient :id="`${uid}-edge`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="35%" stop-color="var(--c-cyan)" />
        <stop offset="65%" stop-color="var(--c-magenta)" />
        <stop offset="100%" stop-color="#ffffff" />
      </linearGradient>
      <radialGradient :id="`${uid}-core`">
        <stop offset="0%" stop-color="#fff" stop-opacity=".9" />
        <stop offset="100%" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- concentric guide stars -->
    <polygon v-for="r in rings" :key="r" :points="star(VECTORS.map(() => r))" class="skill-radar__ring" />
    <line v-for="(v, i) in VECTORS" :key="v.id" :x1="cx" :y1="cy" :x2="tip(i, 100)[0]" :y2="tip(i, 100)[1]" class="skill-radar__axis" />

    <polygon v-if="cmp" :points="cmp" class="skill-radar__compare" />
    <g class="skill-radar__glow">
      <polygon :points="shape" class="skill-radar__shape" :fill="`url(#${uid}-fill)`" stroke="var(--ink)" />
      <polygon :points="shape" :fill="`url(#${uid}-dots)`" class="skill-radar__bumps" />
    </g>
    <circle :cx="cx" :cy="cy" r="22" :fill="`url(#${uid}-core)`" class="skill-radar__core" />

    <g v-for="(v, i) in VECTORS" :key="v.id + 'p'">
      <!-- sparkle on each tip -->
      <g :transform="`translate(${tip(i, vals[i])[0]} ${tip(i, vals[i])[1]})`">
        <path :d="SPARK" class="skill-radar__spark" :style="{ animationDelay: `${i * 0.45}s`, '--c': `var(${v.color})` }" />
      </g>
      <text :x="tip(i, 130)[0]" :y="tip(i, 130)[1] - 4" class="skill-radar__lbl" text-anchor="middle">{{ v.code }}</text>
      <text :x="tip(i, 130)[0]" :y="tip(i, 130)[1] + 11" class="skill-radar__val" text-anchor="middle" :style="{ fill: `var(${v.color})` }">{{ skills[v.id] }}</text>
    </g>
  </svg>
</template>

<style scoped>
.skill-radar { overflow: visible; max-width: 100%; height: auto; }
.skill-radar__ring { fill: none; stroke: rgba(var(--rgb-cyan), .35); stroke-width: 1.2; stroke-dasharray: 5 5; stroke-linejoin: round; }

.skill-radar__axis { stroke: rgba(var(--rgb-cyan), .3); stroke-dasharray: 1 5; stroke-linecap: round; }
.skill-radar__glow { filter: drop-shadow(4px 5px 0 rgba(18, 34, 74, .2)); }
.skill-radar__shape { stroke-width: 2; stroke-linejoin: round; transition: all 700ms var(--ease); animation: star-breathe 5s var(--ease-soft) infinite; transform-origin: 150px 150px; }
.skill-radar__shape { stroke-width: 3; stroke-linejoin: round; }
.skill-radar__bumps { pointer-events: none; transition: all 700ms var(--ease); animation: star-breathe 5s var(--ease-soft) infinite; transform-origin: 150px 150px; }
.skill-radar__compare { fill: none; stroke: var(--c-magenta); stroke-width: 1.5; stroke-dasharray: 4 4; stroke-linejoin: round; opacity: .8; }
.skill-radar__core { opacity: .5; animation: core-pulse 3.2s var(--ease-soft) infinite; transform-origin: 150px 150px; }
.skill-radar__spark { fill: #fff; stroke: var(--ink); stroke-width: 1.2; animation: tip-twinkle 2.6s var(--ease-soft) infinite; transform-box: fill-box; transform-origin: center; }
.skill-radar__lbl { font-family: var(--f-display); font-size: 11px; font-weight: 600; fill: var(--c-text); letter-spacing: .1em; }
.skill-radar__val { font-family: var(--f-mono); font-size: 10px; }
@keyframes star-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
@keyframes core-pulse { 0%, 100% { opacity: .35; transform: scale(.9); } 50% { opacity: .75; transform: scale(1.1); } }
@keyframes tip-twinkle { 0%, 100% { transform: scale(.7) rotate(0deg); opacity: .8; } 50% { transform: scale(1.25) rotate(45deg); opacity: 1; } }
</style>
