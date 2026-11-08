<script setup lang="ts">
/*
 * INCIDENT OPS: entry point. Two tracks: read the Guides, or run Simulations
 * (guided or unguided).
 */
import { VECTORS } from '~/data/incidents'

const TRACKS = [
  {
    to: '/incidents/guides',
    icon: 'list',
    eyebrow: 'Learn',
    title: 'Guides',
    desc: 'Field guides for each threat vector: the red flags to spot, the ideal first moves and the mistakes that make it worse.',
    cta: 'Open guides',
    accent: 'cyan',
  },
  {
    to: '/incidents/simulations',
    icon: 'crosshair',
    eyebrow: 'Practice',
    title: 'Simulations',
    desc: 'Arm threat vectors and respond to a live mixed incident. Run it guided with hints, or unguided on your own.',
    cta: 'Start a simulation',
    accent: 'magenta',
  },
] as const
</script>

<template>
  <div class="hub">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Incident Ops</div>
        <h1 class="page-head__title">Choose your track</h1>
        <p class="page-head__sub">Study the playbook for {{ VECTORS.length }} threat vectors, then put it to work under the clock.</p>
      </div>
    </header>

    <section class="hub__tracks">
      <NuxtLink v-for="t in TRACKS" :key="t.to" :to="t.to" class="hub__track" :class="`hub__track--${t.accent}`">
        <span class="hub__icon"><CyberIcon :name="t.icon" :size="34" /></span>
        <span class="eyebrow">{{ t.eyebrow }}</span>
        <span class="hub__title">{{ t.title }}</span>
        <span class="hub__desc">{{ t.desc }}</span>
        <span class="hub__cta mono">{{ t.cta }} <CyberIcon name="arrow" :size="14" /></span>
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.hub { display: flex; flex-direction: column; gap: var(--s-6); }
.hub .page-head { margin-bottom: 0; }
.hub__tracks { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-5); }
.hub__track {
  --c: var(--c-cyan);
  display: flex; flex-direction: column; gap: var(--s-3);
  padding: var(--s-8);
  min-height: 300px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--c) 12%, transparent), var(--c-bg-1, rgba(6, 8, 15, .85)) 60%);
  border: 1px solid var(--c-line-strong);
  clip-path: var(--clip-chamfer);
  color: var(--c-text);
  transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast);
}
.hub__track--magenta { --c: var(--c-magenta); }
.hub__track:hover { border-color: var(--c); box-shadow: inset 0 0 40px color-mix(in srgb, var(--c) 18%, transparent); text-shadow: none; transform: translateY(-2px); }
.hub__icon { width: 64px; height: 64px; display: grid; place-items: center; color: var(--c); border: 1px solid var(--c); clip-path: var(--clip-chamfer-sm); margin-bottom: var(--s-2); }
.hub__title { font-family: var(--f-display); font-size: var(--fs-2xl); font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: var(--c); }
.hub__desc { color: var(--c-text-dim); max-width: 440px; }
.hub__cta { margin-top: auto; display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); letter-spacing: .18em; text-transform: uppercase; color: var(--c); }
@media (max-width: 800px) { .hub__tracks { grid-template-columns: 1fr; } .hub__track { min-height: 0; padding: var(--s-6); } }
</style>
