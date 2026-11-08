<script setup lang="ts">
// Owns the login-related subscriptions and routes the user:
//   no account + no login state -> /login
//   login stage 'totp'          -> /verify
//   login stage 'enroll'        -> /enroll
//   signed in on a public page  -> /admin for admins, /dashboard for everyone else
// NUXT_PUBLIC_DEV_BYPASS_AUTH=1 (dev server only) disables the redirects.
import { useSpacetimeDB, useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const PUBLIC = new Set(['/login', '/verify', '/enroll']);

const conn = useSpacetimeDB();
const [accountRows, accountReady] = useTable(tables.myAccount);
const [loginRows, loginReady] = useTable(tables.myLoginState);
const { account, loginStage, loginEmail, ready, isAdmin } = useSession();
const route = useRoute();
const bypass = import.meta.dev && String(useRuntimeConfig().public.devBypassAuth) === '1';

watchEffect(() => {
  const a = accountRows.value[0];
  account.value = a ? { ...a } : null;
  const l = loginRows.value[0];
  loginStage.value = l && (l.stage === 'totp' || l.stage === 'enroll') ? l.stage : null;
  loginEmail.value = l?.email ?? '';
  ready.value = conn.isActive && accountReady.value && loginReady.value;
});

watch(
  [ready, account, loginStage, () => route.path],
  () => {
    if (bypass || !ready.value) return;
    const path = route.path;
    let target: string | null = null;
    if (account.value)
      target = PUBLIC.has(path) || path === '/' ? (isAdmin.value ? '/admin' : '/dashboard') : null;
    else if (loginStage.value === 'totp') target = path === '/verify' ? null : '/verify';
    else if (loginStage.value === 'enroll') target = path === '/enroll' ? null : '/enroll';
    else target = path === '/login' ? null : '/login';
    if (target) void navigateTo(target, { replace: true });
  },
  { immediate: true }
);
</script>

<template>
  <slot v-if="bypass || ready" />
  <div v-else class="flex min-h-screen items-center justify-center bg-bg text-neutral-400">
    <p v-if="conn.connectionError">
      Can't reach the server: {{ conn.connectionError.message }}<br />
      <span class="text-sm">Is <code>spacetime start</code> running and the module published?</span>
    </p>
    <p v-else>Connecting…</p>
  </div>
</template>
