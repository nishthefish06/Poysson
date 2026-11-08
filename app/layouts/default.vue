<script setup lang="ts">
// OWNER: UI person. Nav only shows once signed in.
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

const { account, isAdmin } = useSession();
const logout = useReducer(reducers.logout);
const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/practice', label: 'Practice' },
  { to: '/guides', label: 'Guides' },
  { to: '/arena', label: 'Arena' },
  { to: '/profile', label: 'Profile' },
];
</script>

<template>
  <div class="min-h-screen bg-bg text-neutral-100">
    <nav v-if="account" class="flex items-center gap-4 border-b border-line px-6 py-3 text-sm">
      <span class="font-bold text-neon-cyan">poysson.fishing</span>
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" active-class="text-neon-cyan">{{
        l.label
      }}</NuxtLink>
      <NuxtLink v-if="isAdmin" to="/admin" active-class="text-neon-cyan">Admin</NuxtLink>
      <span class="ml-auto text-neutral-400">{{ account.displayName }}</span>
      <button class="text-neutral-400 underline" @click="logout()">Log out</button>
    </nav>
    <slot />
  </div>
</template>
