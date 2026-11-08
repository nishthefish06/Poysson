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
      <span class="scenario-card__code">{{ String(index ?? 0).padStart(2, '0') }} // {{ code }}</span>
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
    <span class="scenario-card__scan" aria-hidden="true" />
  </button>
</template>

<style scoped>
.scenario-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: var(--s-3); text-align: left;
  padding: var(--s-5); min-height: 280px;
  background: var(--c-bg-1); color: var(--c-text);
  border: 1px solid var(--c-line); cursor: pointer;
  clip-path: var(--clip-chamfer);
  transition: border-color var(--t-med), transform var(--t-med) var(--ease), background var(--t-med);
  font-family: var(--f-ui);
  filter: grayscale(.7); opacity: .7;
}
.scenario-card:hover { transform: translateY(-4px); opacity: .9; }
.scenario-card.is-armed { filter: none; opacity: 1; border-color: var(--c); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 12%, var(--c-bg-1)), var(--c-bg-1) 60%); box-shadow: inset 0 0 30px color-mix(in srgb, var(--c) 15%, transparent); }
.scenario-card__top { display: flex; justify-content: space-between; font-family: var(--f-mono); font-size: 10px; letter-spacing: .15em; color: var(--c-text-mute); }
.scenario-card__state { color: var(--c-text-mute); }
.is-armed .scenario-card__state { color: var(--c); text-shadow: 0 0 6px var(--c); }
.scenario-card__icon { width: 64px; height: 64px; display: grid; place-items: center; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 8%, transparent); clip-path: var(--clip-chamfer-sm); }
.scenario-card__name { font-size: var(--fs-lg); letter-spacing: .06em; }
.scenario-card__blurb { font-size: var(--fs-sm); color: var(--c-text-dim); flex: 1; }
.scenario-card__skill { display: grid; grid-template-columns: auto 1fr auto; gap: var(--s-2); align-items: center; font-family: var(--f-mono); font-size: 10px; color: var(--c-text-mute); }
.scenario-card__skill-track { height: 4px; background: var(--c-bg-3); }
.scenario-card__skill-track div { height: 100%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.scenario-card__scan { position: absolute; left: 0; right: 0; height: 40%; top: -40%; background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--c) 18%, transparent), transparent); pointer-events: none; }
.is-armed .scenario-card__scan { animation: scan 3s linear infinite; }
@keyframes scan { to { top: 100%; } }
</style>
