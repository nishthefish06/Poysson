<script setup lang="ts">
// OWNER: Person 1 (logic, working) / UI person (styling). 6-digit code from the authenticator app.
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

const verifyTotp = useReducer(reducers.verifyTotp);
const cancelLogin = useReducer(reducers.cancelLogin);
const { loginEmail } = useSession();
const { error, busy, run } = useRunner();
const code = ref('');
</script>

<template>
  <main class="mx-auto mt-24 max-w-sm p-6">
    <h1 class="text-2xl font-bold">Two-factor authentication</h1>
    <p class="mt-2 text-neutral-400">
      Enter the 6-digit code from your authenticator app for {{ loginEmail }}.
    </p>
    <form class="mt-6 flex gap-2" @submit.prevent="run(() => verifyTotp({ code }))">
      <input
        v-model="code"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        class="flex-1 rounded bg-panel px-3 py-2 font-mono tracking-widest"
      />
      <button :disabled="busy" class="rounded bg-neon-cyan px-4 py-2 font-semibold text-black">Verify</button>
    </form>
    <button class="mt-3 text-sm text-neutral-400 underline" @click="cancelLogin()">Cancel</button>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
  </main>
</template>
