<script setup lang="ts">
import { computed } from 'vue';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/vue';
import { tables, reducers } from '../../app/module_bindings';
import { SPACETIME_DB, SPACETIME_URL, resetIdentity } from './config';
import AuthPanel from './AuthPanel.vue';
import EmployeePanel from './EmployeePanel.vue';
import AdminPanel from './AdminPanel.vue';

const conn = useSpacetimeDB();
const [accountRows] = useTable(tables.myAccount);
const [loginRows] = useTable(tables.myLoginState);
const logout = useReducer(reducers.logout);

const account = computed(() => accountRows.value[0]);
const loginState = computed(() => loginRows.value[0]);
</script>

<template>
  <main>
    <h1>Backend test client</h1>
    <p class="muted">
      {{ SPACETIME_URL }} / {{ SPACETIME_DB }} ·
      <span v-if="conn.isActive" class="ok">connected</span>
      <span v-else-if="conn.connectionError" class="error">{{ conn.connectionError.message }}</span>
      <span v-else>connecting…</span>
      · identity {{ conn.identity?.toHexString().slice(0, 12) ?? '…' }}
      <button title="Forget this browser's identity, like opening a fresh browser" @click="resetIdentity">
        New identity
      </button>
    </p>

    <template v-if="conn.isActive">
      <section v-if="account">
        <div class="row">
          <strong>{{ account.displayName }}</strong>
          <span class="muted">{{ account.email }} · {{ account.role }}</span>
          <span class="muted"
            >· 2FA {{ account.isDemo ? 'skipped (demo)' : account.totpEnabled ? 'on' : 'off' }}</span
          >
          <button @click="logout()">Log out</button>
        </div>
      </section>

      <AuthPanel v-if="!account" :login-state="loginState" />
      <AdminPanel v-if="account?.role === 'admin'" />
      <EmployeePanel v-if="account" />
    </template>
  </main>
</template>
