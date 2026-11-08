<script setup lang="ts">
/**
 * ScenarioCard — a threat vector you can arm/disarm for the mixed incident.
 * state: armed (selected) | disarmed  ·  skill shows your mastery 0-100.
 */
defineProps<{
  code: string
  name: string
  blurb: string
  icon: string
  color: string // css var name e.g. --c-magenta
  armed?: boolean
  skill?: number
  index?: number
}>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button class="scenario-card" :class="{ 'is-armed': armed }" :style="{ '--c': `var(${color})` }" :aria-pressed="armed" @click="$emit('toggle')">
    <div class="scenario-card__top">
      <span class="scenario-card__code">{{ String(index ?? 0).padStart(2, '0') }} · {{ code }}</span>
      <span class="scenario-card__state">{{ armed ? 'ARMED' : 'OFFLINE' }}</span>
    </div>
    <div class="scenario-card__icon"><CyberIcon :name="icon" :size="34" :stroke="1.5" /></div>
    <h3 class="scenario-card__name">{{ name }}</h3>
    <p class="scenario-card__blurb">{{ blurb }}</p>
    <div v-if="skill !== undefined" class="scenario-card__skill">
      <span>MASTERY</span>
      <div class="scenario-card__skill-track"><div :style="{ width: skill + '%' }" /></div>
      <span>{{ skill }}</span>
    </div>
    <SketchBox :color="armed ? 'var(--ink)' : 'var(--c-text-mute)'" :width="armed ? 2.4 : 1.8" />
    <Sparkles v-if="armed" inset :size="12" color="var(--c)" />
  </button>
</template>

<style scoped>
.scenario-card {
  position: relative;
  display: flex; flex-direction: column; gap: var(--s-3); text-align: left;
  padding: var(--s-5); min-height: 280px;
  background: var(--paper); color: var(--c-text);
  border: 0; box-shadow: 4px 5px 0 rgba(18, 34, 74, .14);
  border-radius: var(--r-lg);
  transition: transform var(--t-med) var(--ease-bounce), background var(--t-med), box-shadow var(--t-med), filter var(--t-med), opacity var(--t-med);
  font-family: var(--f-ui);
  filter: grayscale(.85); opacity: .75;
}
.scenario-card:hover { transform: translateY(-5px) rotate(-1deg); opacity: .95; }
.scenario-card.is-armed { filter: none; opacity: 1; background: color-mix(in srgb, var(--c) 9%, var(--paper-2)); box-shadow: 6px 7px 0 color-mix(in srgb, var(--c) 60%, var(--ink)); }
.scenario-card__top { display: flex; justify-content: space-between; font-family: var(--f-mono); font-size: 10px; letter-spacing: .15em; color: var(--c-text-mute); }
.scenario-card__state { color: var(--c-text-mute); }
.is-armed .scenario-card__state { color: #fff; background: var(--c); padding: 1px 8px; border-radius: var(--r-pill); font-weight: 700; }
.scenario-card__icon { width: 64px; height: 64px; display: grid; place-items: center; color: var(--c); border: 2.5px solid var(--ink); background: color-mix(in srgb, var(--c) 14%, var(--paper-2)); border-radius: var(--blob); box-shadow: var(--pop-sm); }
.scenario-card__name { font-size: var(--fs-lg); letter-spacing: .06em; }
.scenario-card__blurb { font-size: var(--fs-sm); color: var(--c-text-dim); flex: 1; }
.scenario-card__skill { display: grid; grid-template-columns: auto 1fr auto; gap: var(--s-2); align-items: center; font-family: var(--f-mono); font-size: 10px; color: var(--c-text-mute); }
.scenario-card__skill-track { height: 8px; background: var(--paper-2); border: 1.5px solid var(--ink); border-radius: var(--r-pill); overflow: hidden; }
.scenario-card__skill-track div { height: 100%; background: repeating-linear-gradient(-45deg, var(--c) 0 5px, color-mix(in srgb, var(--c) 70%, var(--paper-2)) 5px 8px); }
</style>
