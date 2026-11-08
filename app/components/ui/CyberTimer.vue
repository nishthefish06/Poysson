<script setup lang="ts">
/**
 * CyberTimer — countdown display.
 * variant: ring | digital  ·  auto states: normal → warn (<= warnAt) → critical (<= critAt)
 * DYNAMIC: `seconds` is driven by the simulator clock.
 */
const props = withDefaults(defineProps<{ seconds: number; total: number; variant?: 'ring' | 'digital'; warnAt?: number; critAt?: number; label?: string }>(), { variant: 'ring', warnAt: 60, critAt: 20, label: 'T-MINUS' })
const state = computed(() => (props.seconds <= props.critAt ? 'crit' : props.seconds <= props.warnAt ? 'warn' : 'normal'))
const display = computed(() => fmtTime(props.seconds))
const R = 52
const C = 2 * Math.PI * R
const dash = computed(() => C * Math.max(0, props.seconds / props.total))
</script>

<template>
  <div class="cyber-timer" :class="[`cyber-timer--${variant}`, `is-${state}`]" role="timer" :aria-label="`${display} remaining`">
    <template v-if="variant === 'ring'">
      <svg viewBox="0 0 120 120" class="cyber-timer__ring">
        <circle cx="60" cy="60" :r="R" class="cyber-timer__track" />
        <circle cx="60" cy="60" :r="R" class="cyber-timer__arc" :stroke-dasharray="`${dash} ${C}`" />
        <g class="cyber-timer__ticks">
          <line v-for="i in 60" :key="i" x1="60" y1="2" x2="60" :y2="i % 5 === 0 ? 8 : 5" :transform="`rotate(${i * 6} 60 60)`" />
        </g>
      </svg>
      <div class="cyber-timer__center">
        <span class="cyber-timer__label">{{ label }}</span>
        <span class="cyber-timer__value">{{ display }}</span>
      </div>
    </template>
    <template v-else>
      <span class="cyber-timer__label">{{ label }}</span>
      <span class="cyber-timer__value">{{ display }}</span>
    </template>
  </div>
</template>

<style scoped>
.cyber-timer { --c: var(--c-cyan); position: relative; color: var(--c); }
.cyber-timer.is-warn { --c: var(--c-ok); }
.cyber-timer.is-crit { --c: var(--c-harmful); }
.cyber-timer--ring { width: 120px; height: 120px; }
.cyber-timer__ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.cyber-timer__track { fill: none; stroke: var(--c-line); stroke-width: 6; }
.cyber-timer__arc { fill: none; stroke: var(--c); stroke-width: 6; filter: drop-shadow(0 0 6px var(--c)); transition: stroke-dasharray 1s linear, stroke var(--t-med); }
.cyber-timer__ticks line { stroke: var(--c-line-strong); stroke-width: 1; }
.cyber-timer__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cyber-timer__label { font-family: var(--f-mono); font-size: 9px; letter-spacing: .2em; color: var(--c-text-dim); }
.cyber-timer__value { font-family: var(--f-display); font-size: var(--fs-xl); font-weight: 700; text-shadow: 0 0 10px var(--c); font-variant-numeric: tabular-nums; }
.cyber-timer.is-crit .cyber-timer__value { animation: blink 1s steps(2) infinite; }
.cyber-timer--digital { display: inline-flex; flex-direction: column; padding: var(--s-2) var(--s-4); border: 1px solid var(--c); background: color-mix(in srgb, var(--c) 8%, transparent); border-radius: var(--r-md); }
.cyber-timer--digital .cyber-timer__value { font-size: var(--fs-2xl); line-height: 1; }
</style>
