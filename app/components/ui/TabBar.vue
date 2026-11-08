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
.tab-bar { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; background: var(--paper-soft); border-radius: var(--r-md); }
.tab-bar__tab {
  position: relative; display: inline-flex; align-items: center; gap: var(--s-2);
  height: 44px; padding: 0 var(--s-5);
  background: transparent; border: 0; cursor: var(--cursor-fish-bite);
  font-family: var(--f-display); font-weight: 500; font-size: var(--fs-md);
  color: var(--c-text-dim);
  border-radius: var(--r-md) var(--r-md) 0 0;
  transition: color var(--t-fast), background var(--t-fast);
}
.tab-bar__tab:hover { color: var(--c-text); background: var(--c-bg-2); }
.tab-bar__tab.is-active { color: var(--c-magenta); background: var(--paper-2); }
.tab-bar__tab.is-active::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 3px; height: 6px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='6'%3E%3Cpath d='M0 3 Q4 0 8 3 T16 3' fill='none' stroke='%23e20074' stroke-width='2'/%3E%3C/svg%3E") repeat-x; }
.tab-bar__count { font-family: var(--f-mono); font-size: 10px; padding: 0 6px; background: var(--c-bg-3); color: var(--c-text); }
</style>
