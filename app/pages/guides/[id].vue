<script setup lang="ts">
// OWNER: UI person. `body` is plain text from the module; render it nicely.
import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const id = BigInt(useRoute().params.id as string);
const [guides] = useTable(tables.guides);
const g = computed(() => guides.value.find((x) => x.id === id));
</script>

<template>
  <main v-if="g" class="mx-auto max-w-3xl p-8">
    <BackButton to="/guides" label="Back to all guides" />
    <h1 class="mt-2 text-3xl font-bold">{{ g.title }}</h1>
    <p class="mt-2 text-neutral-600">{{ g.summary }}</p>
    <div class="mt-6 whitespace-pre-line">{{ g.body }}</div>
  </main>
</template>
