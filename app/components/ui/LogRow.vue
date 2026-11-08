<script setup lang="ts">
/**
 * LogRow — one line in the live feed.
 * type: alert | log | action
 * - alert:  red/magenta, severity tag, pulsing marker
 * - log:    dim telemetry line
 * - action: player decision, carries a StatusPill (rating)
 * DYNAMIC: streamed in by the simulator.
 */
defineProps<{
  type: 'alert' | 'log' | 'action'
  time: string
  src: string
  text: string
  severity?: 'low' | 'med' | 'high' | 'crit'
  rating?: 'ideal' | 'ok' | 'harmful'
  fresh?: boolean
}>()
</script>

<template>
  <div class="log-row" :class="[`log-row--${type}`, severity && `sev-${severity}`, rating && `rated-${rating}`, { 'is-fresh': fresh }]">
    <span class="log-row__marker" aria-hidden="true" />
    <span class="log-row__time">{{ time }}</span>
    <div class="log-row__body">
      <div class="log-row__head">
        <span class="log-row__src">{{ type === 'action' ? 'YOU' : src }}</span>
        <span v-if="type === 'alert' && severity" class="log-row__sev">{{ severity.toUpperCase() }}</span>
        <StatusPill v-if="type === 'action' && rating" :status="rating" size="sm" class="log-row__pill" />
      </div>
      <div class="log-row__text">{{ text }}</div>
    </div>
  </div>
</template>

<style scoped>
.log-row {
  --c: var(--c-text-mute);
  display: grid; grid-template-columns: 4px 40px 1fr; align-items: start; gap: var(--s-2);
  padding: 7px var(--s-3) 7px 0;
  font-family: var(--f-mono); font-size: 12px; line-height: 1.45;
  border-bottom: 1px solid rgba(30, 41, 69, .6);
}
.log-row.is-fresh { animation: slide-in .3s var(--ease), flash 1.2s; }
@keyframes flash { 0% { background: color-mix(in srgb, var(--c) 25%, transparent); } 100% { background: transparent; } }
.log-row__marker { align-self: stretch; background: var(--c); }
.log-row__time { color: var(--c-text-mute); font-variant-numeric: tabular-nums; font-size: 11px; }
.log-row__body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.log-row__head { display: flex; align-items: center; gap: var(--s-2); }
.log-row__src { color: var(--c); font-weight: 700; font-size: 10px; letter-spacing: .12em; }
.log-row__text { color: var(--c-text-dim); word-break: break-word; }
.log-row__sev { font-size: 9px; font-weight: 700; padding: 0 4px; background: var(--c); color: var(--c-text-invert); }
.log-row__pill { margin-left: auto; }

.log-row--log { --c: var(--c-line-strong); }
.log-row--log .log-row__src { color: var(--c-text-mute); }
.log-row--alert { --c: var(--c-magenta); }
.log-row--alert .log-row__text { color: var(--c-text); }
.log-row--alert.sev-crit, .log-row--alert.sev-high { --c: var(--c-harmful); }
.log-row--alert.sev-low { --c: var(--c-cyan); }
.log-row--action { --c: var(--c-cyan); background: rgba(var(--rgb-cyan), .04); }
.log-row--action .log-row__text { color: var(--c-text); }
.log-row--action.rated-ideal { --c: var(--c-ideal); }
.log-row--action.rated-ok { --c: var(--c-ok); }
.log-row--action.rated-harmful { --c: var(--c-harmful); background: rgba(var(--rgb-harmful), .08); }
</style>
