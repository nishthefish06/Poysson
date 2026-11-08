<script setup lang="ts">
/**
 * CyberPanel — framed container used by every screen section.
 * accent: cyan | magenta | red | none   ·   padded: bool
 */
withDefaults(defineProps<{ title?: string; eyebrow?: string; accent?: 'cyan' | 'magenta' | 'red' | 'none'; padded?: boolean }>(), { accent: 'cyan', padded: true })
</script>

<template>
  <section class="cyber-panel" :class="[`cyber-panel--${accent}`, { 'cyber-panel--flush': !padded }]">
    <header v-if="title || $slots.actions" class="cyber-panel__head">
      <div>
        <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
        <h3 v-if="title" class="cyber-panel__title">{{ title }}</h3>
      </div>
      <div class="spacer" />
      <slot name="actions" />
    </header>
    <div class="cyber-panel__body"><slot /></div>
    <span class="cyber-panel__tick cyber-panel__tick--tl" aria-hidden="true" />
    <span class="cyber-panel__tick cyber-panel__tick--br" aria-hidden="true" />
  </section>
</template>

<style scoped>
.cyber-panel {
  --accent: var(--c-cyan);
  position: relative;
  background: linear-gradient(180deg, rgba(15, 20, 36, .92), rgba(9, 12, 22, .92));
  border: 1px solid var(--c-line);
  clip-path: var(--clip-chamfer);
  display: flex; flex-direction: column; min-height: 0;
}
.cyber-panel--magenta { --accent: var(--c-magenta); }
.cyber-panel--red { --accent: var(--c-harmful); }
.cyber-panel--none { --accent: var(--c-line-strong); }
.cyber-panel__head { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-4) var(--s-5) 0; }
.cyber-panel__title { font-size: var(--fs-md); letter-spacing: .12em; text-transform: uppercase; }
.cyber-panel__body { padding: var(--s-5); flex: 1; min-height: 0; }
.cyber-panel--flush .cyber-panel__body { padding: 0; }
.cyber-panel__tick { position: absolute; width: 18px; height: 18px; pointer-events: none; }
.cyber-panel__tick--tl { top: 0; left: 0; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); transform: translate(6px, 0); }
.cyber-panel__tick--br { right: 0; bottom: 0; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); transform: translate(-6px, 0); }
</style>
