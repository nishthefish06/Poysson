<script setup lang="ts">
/**
 * DepthIndicator: sign-in progress as two stops instead of "Step 1 of 2".
 * The first stop is email + password, the second is the 2FA step. Labels follow the theme:
 * Surface → Deep (Poisson), Ante → Showdown (High Stakes).
 */
const props = defineProps<{ depth: 'surface' | 'deep' }>()
const copy = useCopy()
const STOPS = computed(() => [
  { id: 'surface', label: copy.value.auth.stops[0], hint: 'Password' },
  { id: 'deep', label: copy.value.auth.stops[1], hint: 'Two-factor' },
] as const)
const current = computed(() => STOPS.value.findIndex(s => s.id === props.depth))
</script>

<template>
  <ol class="depth" :class="`is-${depth}`" :aria-label="copy.auth.depthLabel">
    <li
      v-for="(s, i) in STOPS" :key="s.id" class="depth__stop"
      :class="{ 'is-current': i === current, 'is-done': i < current }"
      :aria-current="i === current ? 'step' : undefined"
    >
      <span class="depth__dot" aria-hidden="true" />
      <span class="depth__label">{{ s.label }}</span>
      <span class="sr-only">: {{ s.hint }}{{ i < current ? ', done' : i === current ? ', current' : '' }}</span>
    </li>
    <li class="depth__line" aria-hidden="true"><span class="depth__fill" /></li>
  </ol>
</template>

<style scoped>
.depth { position: relative; list-style: none; margin: var(--s-2) 0 0; padding: 0; display: flex; justify-content: space-between; width: 200px; }
.depth__stop { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.depth__dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--line-ink); background: var(--paper-2); transition: background .4s, transform .4s; }
.is-current .depth__dot { background: var(--c-magenta); transform: scale(1.25); box-shadow: 0 0 0 4px rgba(var(--rgb-magenta), .2); }
.is-done .depth__dot { background: var(--c-cyan); }
.depth__label { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--c-text-dim); }
.is-current .depth__label { color: var(--c-text); }
/* the line between, filling downward-ish as you dive */
.depth__line { position: absolute; left: 7px; right: 7px; top: 6px; height: 2px; background: var(--c-line-strong); z-index: 0; }
.depth__fill { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--c-cyan), var(--c-magenta)); transition: width .8s cubic-bezier(.4, 0, .2, 1); }
.is-deep .depth__fill { width: 100%; }
</style>
