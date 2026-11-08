<script setup lang="ts">
import { COPY as copy } from '~/data/copy'
/*
 * GUIDES: one field guide per threat vector, built from the inject content
 * (red flags, ideal / harmful actions, analyst tips) so it always matches the sims.
 */
import { INJECTS, VECTORS, type VectorId } from '~/data/incidents'

const active = ref<VectorId>(VECTORS[0].id)
const tabs = VECTORS.map(v => ({ id: v.id, label: v.name, icon: v.icon }))
const vector = computed(() => VECTORS.find(v => v.id === active.value)!)

const guide = computed(() => {
  const injects = INJECTS.filter(i => i.vector === active.value)
  const uniq = (xs: string[]) => [...new Set(xs)]
  return {
    scenarios: injects.map(i => ({ id: i.id, title: i.title, severity: i.severity })),
    redFlags: uniq(injects.flatMap(i => i.item.redFlags)),
    doThis: injects.flatMap(i => i.actions.filter(a => a.rating === 'ideal').map(a => ({ label: a.label, why: a.feedback }))),
    avoid: injects.flatMap(i => i.actions.filter(a => a.rating === 'harmful').map(a => ({ label: a.label, why: a.feedback }))),
    tips: uniq(injects.map(i => i.tip)),
  }
})
</script>

<template>
  <div class="guides">
    <header class="page-head">
      <div>
        <NuxtLink to="/incidents" class="guides__back mono"><CyberIcon name="back" :size="14" /> {{ copy.incidents }}</NuxtLink>
        <div class="eyebrow eyebrow--cyan">{{ copy.guides }} · field manual</div>
        <h1 class="page-head__title">Know the threat</h1>
        <p class="page-head__sub">What each attack looks like, what to do first and what never to do.</p>
      </div>
    </header>

    <TabBar v-model="active" :tabs="tabs" />

    <section class="guides__intro" :style="{ '--c': `var(${vector.color})` }">
      <span class="guides__icon"><CyberIcon :name="vector.icon" :size="28" /></span>
      <div>
        <div class="eyebrow">{{ vector.code }}</div>
        <h2 class="guides__name">{{ vector.name }}</h2>
        <p class="dim">{{ vector.blurb }}</p>
      </div>
      <SketchBox :width="2.4" />
      <Sparkles :size="16" color="var(--c)" />
    </section>

    <div class="guides__grid">
      <CyberPanel title="Red flags" eyebrow="Spot these" accent="magenta">
        <ul class="guides__list guides__list--flag">
          <li v-for="f in guide.redFlags" :key="f">{{ f }}</li>
        </ul>
      </CyberPanel>

      <CyberPanel title="Analyst tips" eyebrow="Playbook" accent="cyan">
        <ul class="guides__list guides__list--tip">
          <li v-for="t in guide.tips" :key="t">{{ t }}</li>
        </ul>
      </CyberPanel>

      <CyberPanel title="Do this" eyebrow="Ideal responses" accent="none">
        <ul class="guides__list guides__list--do">
          <li v-for="a in guide.doThis" :key="a.label"><b>{{ a.label }}</b><span>{{ a.why }}</span></li>
        </ul>
      </CyberPanel>

      <CyberPanel title="Never do this" eyebrow="Harmful responses" accent="none">
        <ul class="guides__list guides__list--avoid">
          <li v-for="a in guide.avoid" :key="a.label"><b>{{ a.label }}</b><span>{{ a.why }}</span></li>
        </ul>
      </CyberPanel>
    </div>

    <CyberPanel title="Scenarios in the sim" :eyebrow="`${guide.scenarios.length} injects`" accent="none">
      <div class="guides__scen">
        <div v-for="s in guide.scenarios" :key="s.id" class="guides__scen-item">
          <span class="mono guides__sev" :class="`sev-${s.severity}`">{{ s.severity.toUpperCase() }}</span>
          <span>{{ s.title }}</span>
        </div>
      </div>
    </CyberPanel>
  </div>
</template>

<style scoped>
.guides { display: flex; flex-direction: column; gap: var(--s-5); }
.guides .page-head { margin-bottom: 0; }
.guides__back { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); letter-spacing: .15em; text-transform: uppercase; color: var(--c-text-mute); margin-bottom: var(--s-2); }
.guides__back:hover { color: var(--c-cyan); }
.guides__intro { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-5); padding: var(--s-5) var(--s-6); background: var(--paper); border-radius: var(--r-lg); position: relative; box-shadow: 5px 6px 0 color-mix(in srgb, var(--c) 55%, var(--ink)), var(--glow-panel); }
.guides__icon { width: 56px; height: 56px; display: grid; place-items: center; color: var(--c); border: 2.5px solid var(--ink); background: color-mix(in srgb, var(--c) 12%, var(--paper-2)); border-radius: var(--blob); }
.guides__name { font-family: var(--f-display); font-size: var(--fs-xl); color: var(--c); letter-spacing: .06em; }
.guides__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-5); }
.guides__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-3); }
.guides__list li { position: relative; padding-left: var(--s-5); font-size: var(--fs-sm); color: var(--c-text); }
.guides__list li::before { position: absolute; left: 0; top: 0; font-family: var(--f-mono); }
.guides__list li b { display: block; margin-bottom: 2px; }
.guides__list li span { color: var(--c-text-dim); }
.guides__list--flag li::before { content: '!'; color: var(--c-magenta); }
.guides__list--tip li::before { content: '>'; color: var(--c-cyan); }
.guides__list--do li::before { content: '✓'; color: var(--c-ideal); }
.guides__list--avoid li::before { content: '✕'; color: var(--c-harmful); }
.guides__scen { display: flex; flex-direction: column; gap: var(--s-2); }
.guides__scen-item { display: flex; gap: var(--s-3); align-items: center; padding: var(--s-2) var(--s-3); background: var(--c-bg-2); font-size: var(--fs-sm); }
.guides__sev { font-size: 10px; width: 40px; }
.sev-low { color: var(--c-text-mute); }
.sev-med { color: var(--c-ok); }
.sev-high { color: var(--c-yellow); }
.sev-crit { color: var(--c-harmful); }
@media (max-width: 1000px) { .guides__grid { grid-template-columns: 1fr; } }
</style>
