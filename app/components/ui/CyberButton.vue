<script setup lang="ts">
/**
 * CyberButton
 * variant: primary | secondary | danger | ghost
 * size:    sm | md | lg
 * states:  default · hover · active · disabled · loading
 */
import { NuxtLink } from '#components'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconRight?: string
  loading?: boolean
  disabled?: boolean
  block?: boolean
  to?: string
  type?: 'button' | 'submit'
}>(), { variant: 'primary', size: 'md', type: 'button' })
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="disabled || loading"
    class="cyber-btn"
    :class="[`cyber-btn--${variant}`, `cyber-btn--${size}`, { 'cyber-btn--block': block, 'cyber-btn--loading': loading, 'is-disabled': disabled }]"
  >
    <span class="cyber-btn__glitch" aria-hidden="true" />
    <span v-if="loading" class="cyber-btn__spinner" aria-hidden="true" />
    <CyberIcon v-else-if="icon" :name="icon" :size="size === 'lg' ? 20 : 16" class="cyber-btn__icon" />
    <span class="cyber-btn__label"><slot /></span>
    <CyberIcon v-if="iconRight && !loading" :name="iconRight" :size="size === 'lg' ? 20 : 16" class="cyber-btn__icon" />
  </component>
</template>

<style scoped>
.cyber-btn {
  --btn-fg: var(--c-text-invert);
  --btn-bg: var(--c-cyan);
  --btn-glow: var(--glow-cyan);
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2);
  padding: 0 var(--s-5); height: 42px;
  font-family: var(--f-ui); font-weight: 700; font-size: var(--fs-sm);
  letter-spacing: .14em; text-transform: uppercase;
  color: var(--btn-fg); background: var(--btn-bg);
  border: 0; cursor: pointer; user-select: none; white-space: nowrap;
  clip-path: var(--clip-chamfer-sm);
  transition: transform var(--t-fast) var(--ease), filter var(--t-fast), box-shadow var(--t-med);
  text-decoration: none;
}
.cyber-btn:hover:not(:disabled) { filter: brightness(1.15); box-shadow: var(--btn-glow); text-shadow: none; }
.cyber-btn:active:not(:disabled) { transform: translateY(1px) scale(.98); }
.cyber-btn:disabled, .cyber-btn.is-disabled { opacity: .4; cursor: not-allowed; filter: grayscale(.6); }

/* hover sweep */
.cyber-btn__glitch {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, .45) 50%, transparent 60%);
  transform: translateX(-120%); transition: transform 500ms var(--ease);
}
.cyber-btn:hover:not(:disabled) .cyber-btn__glitch { transform: translateX(120%); }

/* variants */
.cyber-btn--secondary {
  --btn-fg: var(--c-cyan); --btn-bg: transparent;
  box-shadow: inset 0 0 0 1px var(--c-cyan);
  background: linear-gradient(180deg, rgba(0, 240, 255, .08), rgba(0, 240, 255, .02));
}
.cyber-btn--secondary:hover:not(:disabled) { box-shadow: inset 0 0 0 1px var(--c-cyan), var(--glow-cyan); }
.cyber-btn--danger { --btn-bg: var(--c-harmful); --btn-fg: #fff; --btn-glow: var(--glow-red); }
.cyber-btn--ghost { --btn-bg: transparent; --btn-fg: var(--c-text-dim); clip-path: none; }
.cyber-btn--ghost:hover:not(:disabled) { --btn-fg: var(--c-cyan); box-shadow: none; }

/* sizes */
.cyber-btn--sm { height: 32px; padding: 0 var(--s-3); font-size: var(--fs-xs); }
.cyber-btn--lg { height: 54px; padding: 0 var(--s-8); font-size: var(--fs-md); }
.cyber-btn--block { width: 100%; }

.cyber-btn__spinner {
  width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
