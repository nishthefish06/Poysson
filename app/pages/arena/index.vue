<script setup lang="ts">
// OWNER: Person 4 (arena).
import type { ArenaMode, ArenaState } from '@hackutd2026/shared/arena';

const { error, busy, run } = useRunner();
async function start(mode: ArenaMode) {
  await run(async () => {
    const s = await $fetch<ArenaState>('/api/arena/start', { method: 'POST', body: { mode } });
    await navigateTo(`/arena/${s.sessionId}`);
  });
}
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <NuxtLink to="/dashboard" class="text-sm text-neutral-400 underline">← Back to dashboard</NuxtLink>
    <h1 class="mt-2 text-3xl font-bold">Arena</h1>
    <p class="mt-2 text-neutral-400">
      You get a mock work account: mail, a customer care portal, your security settings and your files. An AI
      attacker plays against you live. Some messages are real, some are attacks. If the attacker gets in, it
      really changes things in your account, and you have to find and undo the damage.
    </p>
    <div class="mt-6 grid gap-4 md:grid-cols-2">
      <button
        :disabled="busy"
        class="rounded border border-line p-4 text-left hover:border-neon-pink disabled:opacity-50"
        @click="start('bait')"
      >
        <p class="text-lg font-semibold">🎣 Bait</p>
        <p class="mt-1 text-sm text-neutral-400">
          Nothing has happened yet. Messages arrive; spot the attacks and don't hand over your login. Slip up
          and the attacker gets in.
        </p>
      </button>
      <button
        :disabled="busy"
        class="rounded border border-line p-4 text-left hover:border-neon-pink disabled:opacity-50"
        @click="start('breach')"
      >
        <p class="text-lg font-semibold">🚨 Breach</p>
        <p class="mt-1 text-sm text-neutral-400">
          Someone is already in your account. Find what they changed, lock them out, undo it and report it,
          before they do more.
        </p>
      </button>
    </div>
    <p v-if="busy" class="mt-4 text-neon-pink">Starting… the attacker is picking its first move.</p>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
    <p class="mt-6 text-xs text-neutral-500">
      Everything here is fake: fictional company, fictional customers. Nothing you type into a login form is
      sent anywhere.
    </p>
  </main>
</template>
