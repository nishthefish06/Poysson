<script setup lang="ts">
// OWNER: Person 4 (arena).
import type { ArenaState } from '@hackutd2026/shared/arena';

const { error, busy, run } = useRunner();
async function start() {
  await run(async () => {
    const s = await $fetch<ArenaState>('/api/arena/start', { method: 'POST' });
    await navigateTo(`/arena/${s.sessionId}`);
  });
}
</script>

<template>
  <main class="mx-auto max-w-2xl p-8">
    <h1 class="text-3xl font-bold">Arena</h1>
    <p class="mt-2 text-neutral-400">
      No script, no hints. An AI attacker decides what to throw at you and adapts to everything you do. Some
      messages are real. Your job is to tell the difference.
    </p>
    <button
      :disabled="busy"
      class="mt-6 rounded bg-neon-pink px-4 py-2 font-semibold text-black disabled:opacity-50"
      @click="start"
    >
      {{ busy ? 'Starting…' : 'Enter the arena' }}
    </button>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
  </main>
</template>
