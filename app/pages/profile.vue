<script setup lang="ts">
// OWNER: UI person. Account info + change password (works).
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

const { account } = useSession();
const changePassword = useReducer(reducers.changePassword);
const { error, busy, run } = useRunner();
const currentPassword = ref('');
const newPassword = ref('');
const saved = ref(false);
async function save() {
  saved.value = await run(() =>
    changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
  );
  if (saved.value) currentPassword.value = newPassword.value = '';
}
</script>

<template>
  <main v-if="account" class="mx-auto max-w-xl p-8">
    <h1 class="text-3xl font-bold">{{ account.displayName }}</h1>
    <p class="text-neutral-400">
      {{ account.email }} · {{ account.role }} · 2FA
      {{ account.isDemo ? 'skipped (demo)' : account.totpEnabled ? 'on' : 'off' }}
    </p>
    <form class="mt-8 space-y-3" @submit.prevent="save">
      <h2 class="text-xl font-semibold">Change password</h2>
      <input
        v-model="currentPassword"
        type="password"
        autocomplete="current-password"
        placeholder="Current password"
        class="w-full rounded bg-panel px-3 py-2"
      />
      <input
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        placeholder="New password"
        class="w-full rounded bg-panel px-3 py-2"
      />
      <button :disabled="busy" class="rounded bg-neon-cyan px-4 py-2 font-semibold text-black">Save</button>
      <p v-if="saved" class="text-verdict-ideal">Password changed.</p>
      <p v-if="error" class="text-verdict-harmful">{{ error }}</p>
    </form>
  </main>
</template>
