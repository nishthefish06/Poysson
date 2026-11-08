<script setup lang="ts">
/**
 * StatCard
 * accent: cyan | magenta | yellow | green | red
 * Shows label, big value, optional unit, delta (+/-) and icon.
 * DYNAMIC: value + delta come from player/run state.
 */
withDefaults(defineProps<{
  label: string
  value: string | number
  unit?: string
  delta?: number
  icon?: string
  accent?: 'cyan' | 'magenta' | 'yellow' | 'green' | 'red'
  caption?: string
}>(), { accent: 'cyan' })
</script>

<template>
  <div class="stat-card" :class="`stat-card--${accent}`">
    <div class="stat-card__head">
      <span class="stat-card__label">{{ label }}</span>
      <CyberIcon v-if="icon" :name="icon" :size="16" class="stat-card__icon" />
    </div>
    <div class="stat-card__value">
      {{ value }}<span v-if="unit" class="stat-card__unit">{{ unit }}</span>
    </div>
    <div class="stat-card__foot">
      <span v-if="delta !== undefined" class="stat-card__delta" :class="delta >= 0 ? 'is-up' : 'is-down'">
        {{ delta >= 0 ? '▲' : '▼' }} {{ Math.abs(delta) }}
      </span>
      <span v-if="caption" class="stat-card__caption">{{ caption }}</span>
    </div>
    <span class="stat-card__bar" aria-hidden="true" />
  </div>
</template>

<style scoped>
.stat-card {
  --accent: var(--c-cyan);
  position: relative; overflow: hidden;
  padding: var(--s-4) var(--s-5);
  background: var(--c-bg-1); border: 1px solid var(--c-line);
  clip-path: var(--clip-chamfer-sm);
  display: flex; flex-direction: column; gap: var(--s-1);
  transition: border-color var(--t-med), transform var(--t-med) var(--ease);
}
.stat-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.stat-card--magenta { --accent: var(--c-magenta); }
.stat-card--yellow { --accent: var(--c-yellow); }
.stat-card--green { --accent: var(--c-ideal); }
.stat-card--red { --accent: var(--c-harmful); }
.stat-card__head { display: flex; justify-content: space-between; align-items: center; }
.stat-card__label { font-family: var(--f-mono); font-size: var(--fs-xs); letter-spacing: .18em; text-transform: uppercase; color: var(--c-text-dim); }
.stat-card__icon { color: var(--accent); }
.stat-card__value { font-family: var(--f-display); font-size: var(--fs-2xl); font-weight: 700; color: var(--accent); text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 50%, transparent); line-height: 1.1; }
.stat-card__unit { font-size: var(--fs-md); margin-left: 2px; opacity: .7; }
.stat-card__foot { display: flex; gap: var(--s-2); align-items: center; min-height: 18px; }
.stat-card__delta { font-family: var(--f-mono); font-size: var(--fs-xs); }
.stat-card__delta.is-up { color: var(--c-ideal); }
.stat-card__delta.is-down { color: var(--c-harmful); }
.stat-card__caption { font-size: var(--fs-xs); color: var(--c-text-mute); }
.stat-card__bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
</style>
