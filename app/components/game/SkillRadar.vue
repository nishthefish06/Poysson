<script setup lang="ts">
/**
 * SkillRadar: mastery per threat vector, drawn as a starfish (round arms, lit and shaded, no face).
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
// inner radius as a share of the tips around it; starfish arms are chunky
const VALLEY_FISH = 0.46
const n = VECTORS.length
const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
const at = (a: number, r: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const
const tip = (i: number, v: number) => at(ang(i), R * (v / 100))

/** star outline points: tip, valley, tip, valley… */
const starPoints = (vals: number[]) => {
  const pts: (readonly [number, number])[] = []
  vals.forEach((v, i) => {
    const next = vals[(i + 1) % n]
    pts.push(tip(i, v))
    pts.push(at(ang(i) + Math.PI / n, R * VALLEY_FISH * ((v + next) / 2 / 100)))
  })
  return pts
}
/**
 * Starfish path: a closed Catmull-Rom curve through the star points, so tips and valleys are
 * round (chunky arms) while each tip still lands exactly on its skill value.
 */
const star = (vals: number[]) => {
  const p = starPoints(vals)
  const m = p.length
  const k = (a: number) => p[(a + m) % m]!
  let d = `M${k(0)[0].toFixed(1)},${k(0)[1].toFixed(1)}`
  for (let i = 0; i < m; i++) {
    const [p0, p1, p2, p3] = [k(i - 1), k(i), k(i + 1), k(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]!.toFixed(1)},${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)},${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return `${d}Z`
}
// Keep a tiny minimum so a brand-new player still sees a star, not a dot.
const vals = computed(() => VECTORS.map(v => Math.max(8, props.skills[v.id] ?? 0)))
const shape = computed(() => star(vals.value))
const cmp = computed(() => (props.compare ? star(VECTORS.map(v => Math.max(8, props.compare![v.id] ?? 0))) : ''))
const rings = [25, 50, 75, 100]
// Starfish texture: a row of bumps down the middle of each arm, shrinking
// toward the tip (real starfish texture follows the arms; an even dot grid reads as polka dots).
// Start away from the center so the inner bumps don't form a ring that reads as a face.
const BUMPS = [0.4, 0.54, 0.67, 0.79, 0.9]
const ridges = computed(() => vals.value.map((v, i) => {
  const [x, y] = tip(i, v * 0.94)
  const bumps = BUMPS.map((f, k) => {
    const [bx, by] = at(ang(i), R * (v / 100) * f)
    return { x: bx, y: by, r: Math.max(1.2, (4.4 - k * 0.7) * Math.min(1, v / 60)) }
  })
  return { x, y, bumps }
}))
// Label explainer: hover or Tab to a code (PHX, IDN…) to see what it stands for.
const active = ref<number | null>(null)
const tipFor = computed(() => {
  const i = active.value
  if (i === null) return null
  const v = VECTORS[i]!
  const [x, y] = tip(i, 130)
  return { v, left: `${(x / 300) * 100}%`, top: `${(y / 300) * 100}%`, below: y < 90 }
})
const SPARK = 'M0-7C.4-2.6 2.6-.4 7 0 2.6.4.4 2.6 0 7-.4 2.6-2.6.4-7 0-2.6-.4-.4-2.6 0-7Z'
</script>

<template>
  <div class="skill-radar-wrap" :style="{ width: `${size}px` }">
  <svg class="skill-radar" :width="size" :height="size" viewBox="0 0 300 300" role="group" aria-label="Skill star: mastery per threat vector">
    <defs>
      <!-- starfish body: lighter middle, deeper toward the arm tips -->
      <radialGradient :id="`${uid}-fill`" cx="46%" cy="44%" r="58%">
        <stop offset="0%" stop-color="#ff8cc4" />
        <stop offset="55%" stop-color="#f0278d" />
        <stop offset="100%" stop-color="#c4006a" />
      </radialGradient>
      <!-- raised tubercles: lit from the top left -->
      <radialGradient :id="`${uid}-bump`" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#fff3f9" />
        <stop offset="60%" stop-color="#ffb3d6" />
        <stop offset="100%" stop-color="#f06aa8" />
      </radialGradient>
      <!-- shading: the blurred outline becomes a height map, lit from the top left, so the arms
           look rounded (darker edges, a soft highlight along the top) -->
      <filter :id="`${uid}-relief`" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="height" />
        <feDiffuseLighting in="height" surfaceScale="3" diffuseConstant="1.22" lighting-color="#ffffff" result="diffuse">
          <feDistantLight azimuth="225" elevation="48" />
        </feDiffuseLighting>
        <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="diffuseIn" />
        <feBlend in="SourceGraphic" in2="diffuseIn" mode="multiply" result="shaded" />
        <feSpecularLighting in="height" surfaceScale="3" specularConstant=".32" specularExponent="16" lighting-color="#fff4f9" result="spec">
          <feDistantLight azimuth="225" elevation="55" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
        <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
      <linearGradient :id="`${uid}-edge`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="35%" stop-color="var(--c-cyan)" />
        <stop offset="65%" stop-color="var(--c-magenta)" />
        <stop offset="100%" stop-color="#ffffff" />
      </linearGradient>
    </defs>

    <!-- concentric guide stars -->
    <path v-for="r in rings" :key="r" :d="star(VECTORS.map(() => r))" class="skill-radar__ring" />
    <line v-for="(v, i) in VECTORS" :key="v.id" :x1="cx" :y1="cy" :x2="tip(i, 100)[0]" :y2="tip(i, 100)[1]" class="skill-radar__axis" />

    <path v-if="cmp" :d="cmp" class="skill-radar__compare" />
    <g class="skill-radar__glow">
      <path :d="shape" class="skill-radar__shape" :fill="`url(#${uid}-fill)`" :filter="`url(#${uid}-relief)`" />
      <g class="skill-radar__bumps" aria-hidden="true">
        <template v-for="(r, i) in ridges" :key="'b' + i">
          <circle v-for="(b, k) in r.bumps" :key="k" :cx="b.x" :cy="b.y" :r="b.r" class="skill-radar__bump" :fill="`url(#${uid}-bump)`" />
        </template>
      </g>
    </g>

    <g v-for="(v, i) in VECTORS" :key="v.id + 'p'">
      <!-- sparkle on each tip -->
      <g :transform="`translate(${tip(i, vals[i])[0]} ${tip(i, vals[i])[1]})`">
        <path :d="SPARK" class="skill-radar__spark" :style="{ animationDelay: `${i * 0.45}s`, '--c': `var(${v.color})` }" />
      </g>
      <g
        class="skill-radar__label" tabindex="0" role="img"
        :aria-label="`${v.code}: ${v.name}, skill ${skills[v.id]}. ${v.blurb}`"
        @mouseenter="active = i" @mouseleave="active = null" @focus="active = i" @blur="active = null"
      >
        <rect :x="tip(i, 130)[0] - 24" :y="tip(i, 130)[1] - 17" width="48" height="34" rx="6" class="skill-radar__hit" />
        <text :x="tip(i, 130)[0]" :y="tip(i, 130)[1] - 4" class="skill-radar__lbl" text-anchor="middle">{{ v.code }}</text>
        <text :x="tip(i, 130)[0]" :y="tip(i, 130)[1] + 11" class="skill-radar__val" text-anchor="middle" :style="{ fill: `var(${v.color})` }">{{ skills[v.id] }}</text>
      </g>
    </g>
  </svg>
  <div
    v-if="tipFor" class="skill-radar__tip" :class="{ 'is-below': tipFor.below }"
    :style="{ left: tipFor.left, top: tipFor.top }" aria-hidden="true"
  >
    <span class="skill-radar__tip-title"><b>{{ tipFor.v.code }}</b> · {{ tipFor.v.name }}</span>
    <span class="skill-radar__tip-body">{{ tipFor.v.blurb }}</span>
  </div>
  </div>
</template>

<style scoped>
.skill-radar-wrap { position: relative; display: inline-block; max-width: 100%; line-height: 0; }
.skill-radar { overflow: visible; max-width: 100%; width: 100%; height: auto; }
/* label hover / focus */
.skill-radar__label { cursor: help; outline: none; }
.skill-radar__hit { fill: transparent; }
.skill-radar__label:hover .skill-radar__lbl, .skill-radar__label:focus-visible .skill-radar__lbl { fill: var(--c-magenta); text-decoration: underline; }
.skill-radar__label:focus-visible .skill-radar__hit { stroke: var(--c-magenta); stroke-width: 2; }
.skill-radar__tip {
  position: absolute; z-index: 5; width: max-content; max-width: 220px;
  display: flex; flex-direction: column; gap: 2px; padding: 8px 10px;
  transform: translate(-50%, calc(-100% - 22px));
  background: var(--paper-2, #fff); color: var(--c-text);
  border: 2px solid var(--line-ink, var(--ink)); border-radius: var(--r-md);
  box-shadow: 3px 4px 0 rgba(18, 34, 74, .18);
  font-family: var(--f-ui); font-size: 12px; line-height: 1.35; text-align: left;
  pointer-events: none;
  animation: tip-in 140ms ease-out;
}
.skill-radar__tip.is-below { transform: translate(-50%, 26px); }
.skill-radar__tip-title { font-family: var(--f-display); font-size: 13px; font-weight: 600; }
.skill-radar__tip-title b { color: var(--c-magenta); }
.skill-radar__tip-body { color: var(--c-text-dim); }
@keyframes tip-in { from { opacity: 0; } }
.skill-radar__ring { fill: none; stroke: rgba(var(--rgb-cyan), .35); stroke-width: 1.2; stroke-dasharray: 5 5; stroke-linejoin: round; }

.skill-radar__axis { stroke: rgba(var(--rgb-cyan), .3); stroke-dasharray: 1 5; stroke-linecap: round; }
.skill-radar__glow { filter: drop-shadow(3px 4px 0 rgba(18, 34, 74, .16)); }
.skill-radar__shape { stroke-width: 2; stroke-linejoin: round; transition: all 700ms var(--ease); animation: star-breathe 5s var(--ease-soft) infinite; transform-origin: 150px 150px; }
.skill-radar__shape { stroke: var(--line-ink, var(--ink)); stroke-width: 2; stroke-linejoin: round; }
.skill-radar__bumps { pointer-events: none; transition: all 700ms var(--ease); animation: star-breathe 5s var(--ease-soft) infinite; transform-origin: 150px 150px; }
.skill-radar__bump { stroke: rgba(18, 34, 74, .45); stroke-width: 1; }
.skill-radar__compare { fill: none; stroke: var(--c-magenta); stroke-width: 1.5; stroke-dasharray: 4 4; stroke-linejoin: round; opacity: .8; }
.skill-radar__spark { fill: #fff; stroke: var(--ink); stroke-width: 1.2; animation: tip-twinkle 2.6s var(--ease-soft) infinite; transform-box: fill-box; transform-origin: center; }
.skill-radar__lbl { font-family: var(--f-display); font-size: 11px; font-weight: 600; fill: var(--c-text); letter-spacing: .1em; }
.skill-radar__val { font-family: var(--f-mono); font-size: 10px; }
@keyframes star-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
@keyframes tip-twinkle { 0%, 100% { transform: scale(.7) rotate(0deg); opacity: .8; } 50% { transform: scale(1.25) rotate(45deg); opacity: 1; } }
</style>
