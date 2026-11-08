<script setup lang="ts">
/** StatusPill — status: ideal | ok | harmful | pending · size: sm | md */
const props = withDefaults(defineProps<{ status: 'ideal' | 'ok' | 'harmful' | 'pending'; label?: string; size?: 'sm' | 'md' }>(), { size: 'md' })
const text = computed(() => props.label ?? { ideal: 'IDEAL', ok: 'OK', harmful: 'HARMFUL', pending: 'PENDING' }[props.status])
</script>

<template>
  <span class="status-pill" :class="[`status-pill--${status}`, `status-pill--${size}`]">
    <span class="status-pill__dot" aria-hidden="true" />{{ text }}
  </span>
</template>

<style scoped>
.status-pill {
  --c: var(--c-text-dim);
  display: inline-flex; align-items: center; gap: 6px;
  height: 24px; padding: 0 10px;
  font-family: var(--f-mono); font-size: var(--fs-xs); font-weight: 700; letter-spacing: .14em;
  color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 60%, transparent);
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
  white-space: nowrap;
}
.status-pill__dot { width: 6px; height: 6px; background: var(--c); box-shadow: 0 0 6px var(--c); }
.status-pill--ideal { --c: var(--c-ideal); }
.status-pill--ok { --c: var(--c-ok); }
.status-pill--harmful { --c: var(--c-harmful); }
.status-pill--harmful .status-pill__dot { animation: blink .8s steps(2) infinite; }
.status-pill--sm { height: 18px; padding: 0 8px; font-size: 9px; }
</style>
