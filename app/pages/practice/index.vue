<script setup lang="ts">
// OWNER: Person 3 (practice). Lists assigned simulations + links to questions and guides.
import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const [assignments] = useTable(tables.myRuns);
</script>

<template>
  <main class="mx-auto max-w-5xl p-8">
    <h1 class="text-3xl font-bold">Practice</h1>
    <div class="mt-4 flex gap-4">
      <NuxtLink to="/practice/questions" class="text-neon-cyan underline">Practice questions</NuxtLink>
      <NuxtLink to="/guides" class="text-neon-cyan underline">Response guides</NuxtLink>
    </div>

    <h2 class="mt-8 text-xl font-semibold">My simulations</h2>
    <p v-if="!assignments.length" class="mt-2 text-neutral-500">
      Nothing assigned yet. An admin assigns simulations.
    </p>
    <NuxtLink
      v-for="a in assignments"
      :key="String(a.id)"
      :to="`/practice/${a.id}`"
      class="mt-3 block rounded border border-line bg-panel p-4 hover:border-neon-cyan"
    >
      <p class="font-semibold">{{ a.title }}</p>
      <p class="text-sm text-neutral-400">
        {{ a.attackType }} · {{ a.difficulty }} · {{ a.status }}
        <span v-if="a.score !== undefined && a.score !== null"> · score {{ a.score }}</span>
      </p>
    </NuxtLink>
  </main>
</template>
