<script setup lang="ts">
/**
 * VectorTip: a threat-vector code (PHX, IDN, MAL, EXF, INS) that explains itself.
 * Hover it, or Tab to it, and a small card says what the code stands for and what it covers.
 * Renders just the code as text, so it inherits the surrounding chip's color and font.
 */
import { vectorById, type VectorId } from '~/data/incidents'

const props = withDefaults(defineProps<{ vector: VectorId; placement?: 'top' | 'bottom' }>(), { placement: 'top' })
const v = computed(() => vectorById(props.vector))
const id = `vtip-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <span class="vtip" :class="`vtip--${placement}`" tabindex="0" :aria-describedby="id">
    {{ v.code }}
    <span :id="id" role="tooltip" class="vtip__pop">
      <span class="vtip__title"><b>{{ v.code }}</b> · {{ v.name }}</span>
      <span class="vtip__body">{{ v.blurb }}</span>
    </span>
  </span>
</template>

<style scoped>
.vtip { position: relative; display: inline; cursor: help; border-bottom: 1px dotted currentColor; outline-offset: 2px; }
.vtip__pop {
  position: absolute; left: 50%; bottom: calc(100% + 8px); z-index: 40;
  width: max-content; max-width: 230px;
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 10px;
  background: var(--paper-2, #fff); color: var(--c-text);
  border: 2px solid var(--line-ink, var(--ink)); border-radius: var(--r-md);
  box-shadow: 3px 4px 0 rgba(18, 34, 74, .18);
  font-family: var(--f-ui); font-size: 12px; font-weight: 500; line-height: 1.35;
  letter-spacing: 0; text-transform: none; text-align: left; white-space: normal;
  opacity: 0; visibility: hidden; transform: translate(-50%, 4px);
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms;
  pointer-events: none;
}
/* little pointer under the card */
.vtip__pop::after {
  content: ''; position: absolute; left: 50%; top: 100%; width: 10px; height: 10px;
  background: inherit; border: inherit; border-top: 0; border-left: 0;
  transform: translate(-50%, -5px) rotate(45deg);
}
.vtip:hover .vtip__pop, .vtip:focus-visible .vtip__pop { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
.vtip__title { font-family: var(--f-display); font-size: 13px; font-weight: 600; }
.vtip__title b { color: var(--c-magenta); }
.vtip__body { color: var(--c-text-dim); }
/* below the code, for spots near the top of a clipped area (simulator bar, scrolling lists) */
.vtip--bottom .vtip__pop { bottom: auto; top: calc(100% + 8px); transform: translate(-50%, -4px); }
.vtip--bottom .vtip__pop::after { top: auto; bottom: 100%; transform: translate(-50%, 5px) rotate(225deg); }
.vtip--bottom:hover .vtip__pop, .vtip--bottom:focus-visible .vtip__pop { transform: translate(-50%, 0); }
@media (prefers-reduced-motion: reduce) { .vtip__pop { transition: none; } }
</style>
