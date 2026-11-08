<script setup lang="ts">
// Practice: published scenarios you can start yourself (guided), plus your runs (assigned or self-started).
import { useReducer, useTable } from 'spacetimedb/vue';
import { reducers, tables } from '~/module_bindings';

const [scenarios] = useTable(tables.availableScenarios);
const [runs] = useTable(tables.myRuns);
const startSimulation = useReducer(reducers.startSimulation);
const { error, busy, run } = useRunner();

const sortedRuns = computed(() => [...runs.value].sort((a, b) => (a.id < b.id ? 1 : -1)));
const statusLabel: Record<string, string> = {
  assigned: 'assigned to you',
  in_progress: 'in progress',
  submitted: 'waiting for score',
  reviewed: 'scored',
};

// The reducer doesn't return the new run id: wait for a run we haven't seen yet.
async function start(scenarioId: bigint) {
  const before = new Set(runs.value.map((r) => r.id));
  const ok = await run(() => startSimulation({ scenarioId, mode: 'guided' }));
  if (!ok) return;
  const stop = watch(
    runs,
    (rs) => {
      const fresh = rs.find((r) => !before.has(r.id) && r.scenarioId === scenarioId);
      if (fresh) {
        stop();
        void navigateTo(`/practice/${fresh.id}`);
      }
    },
    { immediate: true }
  );
}
</script>

<template>
  <main class="mx-auto max-w-5xl rounded bg-panel p-8">
    <h1 class="text-3xl font-bold">Practice</h1>
    <div class="mt-4 flex gap-4">
      <NuxtLink to="/practice/questions" class="text-neon-cyan underline">Practice questions</NuxtLink>
      <NuxtLink to="/guides" class="text-neon-cyan underline">Response guides</NuxtLink>
    </div>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>

    <h2 class="mt-8 text-xl font-semibold">My simulations</h2>
    <p v-if="!sortedRuns.length" class="mt-2 text-neutral-500">
      None yet. Start one below, or wait for an admin to assign one.
    </p>
    <NuxtLink
      v-for="r in sortedRuns"
      :key="String(r.id)"
      :to="`/practice/${r.id}`"
      class="mt-3 block rounded border border-line bg-panel p-4 hover:border-neon-cyan"
    >
      <p class="font-semibold">{{ r.title }}</p>
      <p class="text-sm text-neutral-600">
        {{ r.attackType }} · {{ r.difficulty }} · {{ r.mode }} · {{ statusLabel[r.status] ?? r.status }}
        <span v-if="r.score !== undefined"> · score {{ r.score }}</span>
      </p>
    </NuxtLink>

    <h2 class="mt-8 text-xl font-semibold">Start a guided simulation</h2>
    <p v-if="!scenarios.length" class="mt-2 text-neutral-500">No published scenarios yet.</p>
    <div class="mt-3 grid gap-3 md:grid-cols-2">
      <div v-for="s in scenarios" :key="String(s.id)" class="rounded border border-line bg-panel p-4">
        <p class="font-semibold">{{ s.title }}</p>
        <p class="text-sm text-neutral-600">{{ s.attackType }} · {{ s.difficulty }}</p>
        <p class="mt-1 text-sm">{{ s.summary }}</p>
        <button
          :disabled="busy"
          class="mt-3 rounded bg-neon-cyan px-3 py-1 font-semibold text-white disabled:opacity-50"
          @click="start(s.id)"
        >
          Start
        </button>
      </div>
    </div>
  </main>
</template>
