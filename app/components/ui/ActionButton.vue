<script setup lang="ts">
/**
 * ActionButton — simulator response option.
 * state: idle | chosen | locked (another option was chosen) | disabled
 * rating revealed only after the choice: ideal | ok | harmful
 */
defineProps<{
  label: string
  hotkey?: string
  state?: 'idle' | 'chosen' | 'locked' | 'disabled'
  rating?: 'ideal' | 'ok' | 'harmful'
  points?: number
}>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button
    class="action-btn"
    :class="[`action-btn--${state ?? 'idle'}`, state === 'chosen' && rating && `is-${rating}`]"
    :disabled="state && state !== 'idle'"
    @click="$emit('select')"
  >
    <span v-if="hotkey" class="action-btn__key">{{ hotkey }}</span>
    <span class="action-btn__label">{{ label }}</span>
    <span v-if="state === 'chosen' && rating" class="action-btn__result">
      <StatusPill :status="rating" size="sm" />
      <span class="action-btn__pts">{{ (points ?? 0) > 0 ? '+' : '' }}{{ points }}</span>
    </span>
    <CyberIcon v-else-if="!state || state === 'idle'" name="arrow" :size="14" class="action-btn__arrow" />
  </button>
</template>

<style scoped>
.action-btn {
  --c: var(--c-cyan);
  width: 100%; display: flex; align-items: center; gap: var(--s-3);
  min-height: 52px; padding: var(--s-2) var(--s-3);
  background: var(--c-bg-2); color: var(--c-text);
  border: 1px solid var(--c-line-strong); border-left: 3px solid var(--c);
  font-family: var(--f-ui); font-size: var(--fs-sm); font-weight: 600; text-align: left;
  cursor: pointer; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  transition: background var(--t-fast), border-color var(--t-fast), transform var(--t-fast);
}
.action-btn--idle:hover { background: var(--c-bg-3); border-color: var(--c); transform: translateX(3px); box-shadow: inset 0 0 20px rgba(0, 240, 255, .1); }
.action-btn--idle:active { transform: translateX(3px) scale(.99); }
.action-btn__key { flex-shrink: 0; width: 24px; height: 24px; display: grid; place-items: center; font-family: var(--f-mono); font-size: 11px; font-weight: 700; color: var(--c); border: 1px solid var(--c); }
.action-btn__label { flex: 1; }
.action-btn__arrow { color: var(--c-text-mute); }
.action-btn--idle:hover .action-btn__arrow { color: var(--c); }
.action-btn__result { display: flex; align-items: center; gap: var(--s-2); }
.action-btn__pts { font-family: var(--f-display); font-size: var(--fs-sm); color: var(--c); }
.action-btn--chosen { cursor: default; }
.action-btn--chosen.is-ideal { --c: var(--c-ideal); background: rgba(57, 255, 136, .08); border-color: var(--c-ideal); }
.action-btn--chosen.is-ok { --c: var(--c-ok); background: rgba(255, 176, 32, .08); border-color: var(--c-ok); }
.action-btn--chosen.is-harmful { --c: var(--c-harmful); background: rgba(255, 59, 92, .12); border-color: var(--c-harmful); animation: shake .4s; }
.action-btn--locked, .action-btn--disabled { opacity: .35; cursor: not-allowed; --c: var(--c-line-strong); }
</style>
