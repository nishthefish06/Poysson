<script setup lang="ts">
// OWNER: Person 1 + UI person. Admin console. A complete working reference for every admin reducer
// (accounts, scenarios, assignments, reviews) is in test-client/src/AdminPanel.vue: port from there.
import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const { isAdmin } = useSession();
const [accounts] = useTable(tables.adminAccounts);
const [scenarios] = useTable(tables.allScenarios);
const [assignments] = useTable(tables.allRuns);
const toReview = computed(() => assignments.value.filter((a) => a.status === 'submitted'));
</script>

<template>
  <main v-if="isAdmin" class="mx-auto max-w-5xl p-8">
    <h1 class="text-3xl font-bold">Admin</h1>
    <div class="mt-6 grid grid-cols-3 gap-4">
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ accounts.length }}</p>
        <p class="text-sm text-neutral-400">Accounts</p>
      </div>
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ scenarios.length }}</p>
        <p class="text-sm text-neutral-400">Scenarios</p>
      </div>
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ toReview.length }}</p>
        <p class="text-sm text-neutral-400">Reports to review</p>
      </div>
    </div>
    <NuxtLink to="/admin/generate" class="mt-6 inline-block text-neon-cyan underline"
      >Generate a scenario with AI →</NuxtLink
    >
    <!-- TODO: accounts, scenarios, assign, review: port from test-client/src/AdminPanel.vue -->
  </main>
  <main v-else class="p-8 text-neutral-500">Admins only.</main>
</template>
