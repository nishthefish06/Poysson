<script setup lang="ts">
// OWNER: Person 1 (logic, working) / UI person (styling)
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

const login = useReducer(reducers.login);
const { error, busy, run } = useRunner();
const email = ref('');
const password = ref('');
// SessionGate moves to /verify, /enroll or /dashboard once the server updates the views.
</script>

<template>
  <main class="mx-auto mt-24 max-w-sm p-6">
    <h1 class="text-2xl font-bold">Sign in</h1>
    <form class="mt-6 space-y-3" @submit.prevent="run(() => login({ email, password }))">
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        placeholder="Email"
        class="w-full rounded bg-panel px-3 py-2"
      />
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="Password"
        class="w-full rounded bg-panel px-3 py-2"
      />
      <button
        :disabled="busy"
        class="w-full rounded bg-neon-cyan px-3 py-2 font-semibold text-black disabled:opacity-50"
      >
        Sign in
      </button>
    </form>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
    <p class="mt-6 text-sm text-neutral-500">Demo: demo.employee@example.com / demo.admin@example.com</p>
  </main>
</template>
