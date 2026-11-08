<script setup lang="ts">
/** TabBar — v-model is the active tab id. Each tab: { id, label, icon?, count? } */
const model = defineModel<string>({ required: true })
defineProps<{ tabs: { id: string; label: string; icon?: string; count?: number }[] }>()
</script>

<template>
  <div class="tab-bar" role="tablist">
    <button
      v-for="t in tabs" :key="t.id" role="tab" :aria-selected="model === t.id"
      class="tab-bar__tab" :class="{ 'is-active': model === t.id }" @click="model = t.id"
    >
      <CyberIcon v-if="t.icon" :name="t.icon" :size="15" />
      <span>{{ t.label }}</span>
      <span v-if="t.count !== undefined" class="tab-bar__count">{{ t.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.tab-bar { display: flex; gap: 2px; border-bottom: 1px solid var(--c-line-strong); }
.tab-bar__tab {
  position: relative; display: inline-flex; align-items: center; gap: var(--s-2);
  height: 44px; padding: 0 var(--s-5);
  background: transparent; border: 0; cursor: pointer;
  font-family: var(--f-ui); font-weight: 600; font-size: var(--fs-sm); letter-spacing: .14em; text-transform: uppercase;
  color: var(--c-text-dim);
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%);
  transition: color var(--t-fast), background var(--t-fast);
}
.tab-bar__tab:hover { color: var(--c-text); background: var(--c-bg-2); }
.tab-bar__tab.is-active { color: var(--c-cyan); background: linear-gradient(180deg, rgba(0, 240, 255, .14), rgba(0, 240, 255, .02)); text-shadow: var(--text-glow-cyan); }
.tab-bar__tab.is-active::after { content: ''; position: absolute; left: 10px; right: 10px; bottom: 0; height: 2px; background: var(--c-cyan); box-shadow: 0 0 10px var(--c-cyan); }
.tab-bar__count { font-family: var(--f-mono); font-size: 10px; padding: 0 6px; background: var(--c-bg-3); color: var(--c-text); }
</style>
