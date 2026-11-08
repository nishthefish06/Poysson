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
    <SketchBox v-if="variant !== 'ghost'" :width="size === 'sm' ? 1.6 : 2" :overshoot="size === 'sm' ? 5 : 7" />
    <span v-if="loading" class="cyber-btn__spinner" aria-hidden="true" />
    <CyberIcon v-else-if="icon" :name="icon" :size="size === 'lg' ? 20 : 16" class="cyber-btn__icon" />
    <span class="cyber-btn__label"><slot /></span>
    <CyberIcon v-if="iconRight && !loading" :name="iconRight" :size="size === 'lg' ? 20 : 16" class="cyber-btn__icon" />
  </component>
</template>

<style scoped>
.cyber-btn {
  --btn-fg: #fff;
  --btn-bg: var(--c-magenta);
  --btn-shadow: var(--ink);
  position: relative;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2);
  padding: 0 var(--s-6); height: 44px;
  font-family: var(--f-display); font-weight: 600; font-size: var(--fs-md);
  letter-spacing: .02em;
  color: var(--btn-fg); background: var(--btn-bg);
  border: 0; border-radius: var(--r-md); user-select: none; white-space: nowrap;
  box-shadow: 3px 4px 0 var(--btn-shadow);
  transition: transform var(--t-fast) var(--ease-bounce), box-shadow var(--t-fast), background var(--t-fast);
  text-decoration: none;
}
.cyber-btn:hover:not(:disabled) { transform: translate(-1px, -2px) rotate(-.6deg); box-shadow: 5px 7px 0 var(--btn-shadow); text-decoration: none; background: var(--btn-hover, var(--c-magenta-light)); }
.cyber-btn:active:not(:disabled) { transform: translate(2px, 3px); box-shadow: 0 0 0 var(--btn-shadow); }
.cyber-btn:disabled, .cyber-btn.is-disabled { opacity: .45; cursor: not-allowed; filter: grayscale(.5); }

/* variants */
.cyber-btn--secondary { --btn-fg: var(--ink); --btn-bg: var(--paper-2); --btn-hover: var(--c-magenta-tint); }
.cyber-btn--danger { --btn-bg: var(--c-harmful); --btn-hover: #f2475f; }
.cyber-btn--ghost { --btn-bg: transparent; --btn-fg: var(--c-text-dim); --btn-hover: rgba(var(--rgb-magenta), .08); box-shadow: none; font-family: var(--f-ui); font-weight: 700; }
.cyber-btn--ghost:hover:not(:disabled) { --btn-fg: var(--c-magenta); box-shadow: none; transform: none; }

/* sizes */
.cyber-btn--sm { height: 34px; padding: 0 var(--s-4); font-size: var(--fs-sm); box-shadow: 2px 3px 0 var(--btn-shadow); }
.cyber-btn--lg { height: 56px; padding: 0 var(--s-8); font-size: var(--fs-lg); }
.cyber-btn--block { width: 100%; }
.cyber-btn__label, .cyber-btn__icon { position: relative; z-index: 2; }

.cyber-btn__spinner {
  width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
