<script setup lang="ts">
import { COPY as copy } from '~/data/copy'
/*
 * INCIDENT OPS: entry point. Two tracks: read the Guides, or run Simulations
 * (guided or unguided).
 */
import { VECTORS } from '~/data/incidents'

const TRACKS = [
  {
    to: '/incidents/guides',
    icon: 'fish',
    eyebrow: 'Learn',
    title: copy.guides,
    desc: copy.guidesDesc,
    cta: 'Open the tackle box',
    accent: 'cyan',
  },
  {
    to: '/incidents/simulations',
    icon: 'hook',
    eyebrow: 'Practice',
    title: copy.sims,
    desc: copy.simsDesc,
    cta: 'Cast off',
    accent: 'magenta',
  },
  {
    to: '/practice',
    icon: 'anchor',
    eyebrow: 'Assigned',
    title: 'Charter trips',
    desc: 'Drills your manager booked for you, plus published scenarios you can take out yourself. Scored and saved to your record.',
    cta: 'See my trips',
    accent: 'magenta',
  },
  {
    to: '/practice/questions',
    icon: 'check',
    eyebrow: 'Quiz',
    title: 'Quick bites',
    desc: 'Short scenario questions with the answer explained. A five-minute refresher between casts.',
    cta: 'Answer a few',
    accent: 'cyan',
  },
] as const
</script>

<template>
  <div class="hub">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">{{ copy.incidents }}</div>
        <h1 class="page-head__title">{{ copy.hubTitle }}</h1>
        <p class="page-head__sub">Study the playbook for {{ VECTORS.length }} threat vectors, then put it to work under the clock.</p>
      </div>
    </header>

    <section class="hub__tracks">
      <NuxtLink v-for="t in TRACKS" :key="t.to" :to="t.to" class="hub__track" :class="`hub__track--${t.accent}`">
        <span class="hub__line" aria-hidden="true">
          <svg viewBox="0 0 24 120" width="24" height="120"><path d="M12 0V96" stroke="var(--ink)" stroke-width="1.5" /><path d="M12 96v10a5 5 0 01-10 0v-3" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" /><circle cx="12" cy="60" r="5" fill="#e20074" stroke="#12224a" stroke-width="1.5" /><path d="M7 60h10" stroke="#fff" stroke-width="2" /></svg>
        </span>
        <span class="hub__icon"><CyberIcon :name="t.icon" :size="34" /></span>
        <span class="eyebrow">{{ t.eyebrow }}</span>
        <span class="hub__title">{{ t.title }}</span>
        <span class="hub__desc">{{ t.desc }}</span>
        <span class="hub__cta mono">{{ t.cta }} <CyberIcon name="arrow" :size="14" /></span>
        <SketchBox :width="2.6" />
        <Sparkles inset :size="16" color="var(--c)" />
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
  background: var(--paper);
  position: relative;
  border: 0;
  border-radius: var(--r-lg);
  box-shadow: 6px 7px 0 color-mix(in srgb, var(--c) 55%, var(--ink)), var(--glow-panel);
  color: var(--c-text);
  transition: box-shadow var(--t-med) var(--ease-bounce), transform var(--t-med) var(--ease-bounce);
}
.hub__track--magenta { --c: var(--c-magenta); }
.hub__track:hover { text-decoration: none; transform: translate(-2px, -4px) rotate(-.8deg); box-shadow: 9px 11px 0 color-mix(in srgb, var(--c) 55%, var(--ink)), var(--glow-panel); }
.hub__icon { width: 64px; height: 64px; display: grid; place-items: center; color: var(--c); border: 1px solid var(--c); border-radius: var(--blob); animation: blob 10s var(--ease-soft) infinite; box-shadow: var(--pop-sm); border-width: 2.5px; background: color-mix(in srgb, var(--c) 12%, var(--paper-2)); margin-bottom: var(--s-2); }
.hub__title { font-family: var(--f-display); font-size: var(--fs-2xl); font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--c);  }
.hub__desc { color: var(--c-text-dim); max-width: 440px; }
.hub__cta { margin-top: auto; display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); letter-spacing: .18em; text-transform: uppercase; color: var(--c); }
.hub__line { position: absolute; top: -40px; right: 18%; z-index: 3; transform: translateY(-60%); opacity: 0; transition: transform 700ms var(--ease-bounce), opacity 300ms; pointer-events: none; }
.hub__line svg { display: block; }
.hub__track:hover .hub__line { transform: translateY(0); opacity: 1; animation: bob 2.2s ease-in-out 700ms infinite; }
@keyframes bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 8px; } }
@media (max-width: 800px) { .hub__tracks { grid-template-columns: 1fr; } .hub__track { min-height: 0; padding: var(--s-6); } }
</style>
