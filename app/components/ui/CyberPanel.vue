<script setup lang="ts">
/**
 * CyberPanel — framed container used by every screen section.
 * accent: cyan | magenta | red | none   ·   padded: bool
 */
const props = withDefaults(defineProps<{ title?: string; eyebrow?: string; accent?: 'cyan' | 'magenta' | 'red' | 'none'; padded?: boolean; sparkles?: boolean }>(), { accent: 'cyan', padded: true, sparkles: true })
// Two diagonal corners per panel keeps a page of panels from looking busy.
const sparkleCorners = computed(() => (props.sparkles ? (['tl', 'br'] as const).slice() : []))
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
    <SketchBox />
    <Sparkles :corners="sparkleCorners" :color="'var(--accent)'" />
  </section>
</template>

<style scoped>
.cyber-panel {
  --accent: var(--c-cyan);
  position: relative;
  background: var(--paper);
  border-radius: var(--r-lg);
  box-shadow: 5px 6px 0 rgba(18, 34, 74, .16), var(--glow-panel);
  display: flex; flex-direction: column; min-height: 0;
}
/* accent tab: a little marker stripe under the title */
.cyber-panel--magenta { --accent: var(--c-magenta); }
.cyber-panel--red { --accent: var(--c-harmful); }
.cyber-panel--none { --accent: var(--c-violet); }
.cyber-panel__head { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-5) var(--s-6) 0; }
.cyber-panel__title {
  font-size: var(--fs-lg); color: var(--ink); display: inline;
  background: linear-gradient(100deg, transparent 1%, color-mix(in srgb, var(--accent) 30%, transparent) 3%, color-mix(in srgb, var(--accent) 22%, transparent) 96%, transparent 99%) 0 90% / 100% 38% no-repeat;
  padding: 0 .15em;
}
.cyber-panel__body { padding: var(--s-5) var(--s-6) var(--s-6); flex: 1; min-height: 0; }
.cyber-panel--flush .cyber-panel__body { padding: 0; }
</style>
