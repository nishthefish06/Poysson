<script setup lang="ts">
// OWNER: logic here works; UI person styles it. Two areas: Practice and Arena.
import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const [statsRows] = useTable(tables.myStats);
const [assignments] = useTable(tables.myAssignments);
const { account } = useSession();

const stats = computed(() => statsRows.value[0]);
const pending = computed(() => assignments.value.filter((a) => a.status === 'assigned'));
</script>

<template>
  <main class="mx-auto max-w-5xl p-8">
    <h1 class="text-3xl font-bold">Welcome back, {{ account?.displayName }}</h1>

    <!-- admin-assigned simulations pop up here -->
    <div v-for="a in pending" :key="String(a.id)" class="mt-4 rounded border border-neon-pink p-3">
      <strong>New simulation:</strong> {{ a.popupMessage || a.title }}
      <NuxtLink :to="`/practice/${a.id}`" class="ml-2 text-neon-cyan underline">Start</NuxtLink>
    </div>

    <div class="mt-8 grid gap-6 md:grid-cols-2">
      <NuxtLink to="/practice" class="rounded border border-line bg-panel p-6 hover:border-neon-cyan">
        <h2 class="text-xl font-semibold">Practice</h2>
        <p class="mt-2 text-neutral-400">Assigned simulations, practice questions and response guides.</p>
      </NuxtLink>
      <NuxtLink to="/arena" class="rounded border border-line bg-panel p-6 hover:border-neon-pink">
        <h2 class="text-xl font-semibold">Arena</h2>
        <p class="mt-2 text-neutral-400">No script. An AI attacker adapts to everything you do.</p>
      </NuxtLink>
    </div>

    <section v-if="stats" class="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ stats.reviewed }}</p>
        <p class="text-sm text-neutral-400">Simulations reviewed</p>
      </div>
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ stats.averageScore?.toFixed(0) ?? '—' }}</p>
        <p class="text-sm text-neutral-400">Average score</p>
      </div>
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ stats.practiceCorrect }}/{{ stats.practiceAnswered }}</p>
        <p class="text-sm text-neutral-400">Practice correct</p>
      </div>
      <div class="rounded bg-panel p-4">
        <p class="text-2xl font-bold">{{ stats.assigned + stats.inProgress }}</p>
        <p class="text-sm text-neutral-400">To do</p>
      </div>
    </section>
    <PoyoMascot mood="idle" />
  </main>
</template>
