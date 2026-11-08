<script setup lang="ts">
// OWNER: UI person. Guides come from SpacetimeDB (seeded; admins can edit).
import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const [guides] = useTable(tables.guides);
const sorted = computed(() => [...guides.value].sort((a, b) => a.sortOrder - b.sortOrder));
</script>

<template>
  <main class="mx-auto max-w-4xl p-8">
    <h1 class="text-3xl font-bold">Response guides</h1>
    <NuxtLink
      v-for="g in sorted"
      :key="String(g.id)"
      :to="`/guides/${g.id}`"
      class="mt-4 block rounded border border-line bg-panel p-4 hover:border-neon-cyan"
    >
      <p class="text-xs uppercase text-neutral-500">{{ g.attackType }}</p>
      <p class="font-semibold">{{ g.title }}</p>
      <p class="text-sm text-neutral-400">{{ g.summary }}</p>
    </NuxtLink>
  </main>
</template>
