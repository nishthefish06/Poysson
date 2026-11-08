<script setup lang="ts">
// Step 1: email + password via the `login` reducer. SessionGate then routes to /verify, /enroll
// or (demo accounts) /dashboard once the server updates the views.
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

definePageMeta({ layout: 'auth' });
const login = useReducer(reducers.login);
const { error, busy, run } = useRunner();
const email = ref('');
const password = ref('');
const errors = reactive({ email: '', password: '' });

function submit() {
  errors.email = /.+@.+\..+/.test(email.value) ? '' : 'Enter a valid email';
  errors.password = password.value ? '' : 'Enter your password';
  if (errors.email || errors.password) return;
  void run(() => login({ email: email.value, password: password.value }));
}
</script>

<template>
  <form class="login" @submit.prevent="submit">
    <div class="eyebrow eyebrow--magenta">Step 01 / 02 · Authenticate</div>
    <h1 class="login__title">Jack in</h1>
    <p class="dim login__sub">Operators only. All sessions are logged.</p>

    <CyberInput
      v-model="email"
      label="Email"
      type="email"
      icon="user"
      placeholder="you@t-mobile.com"
      autocomplete="username"
      :error="errors.email"
    />
    <CyberInput
      v-model="password"
      label="Password"
      type="password"
      icon="lock"
      placeholder="••••••••••"
      autocomplete="current-password"
      :error="errors.password"
    />

    <p v-if="error" class="login__err mono" role="alert">! {{ error }}</p>

    <CyberButton type="submit" variant="primary" size="lg" block :loading="busy" icon-right="arrow"
      >Authenticate</CyberButton
    >
    <p class="login__demo mono">Demo: demo.employee@example.com · demo.admin@example.com</p>
  </form>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.login__title {
  font-size: var(--fs-3xl);
  line-height: 1;
  text-transform: uppercase;
}
.login__sub {
  font-size: var(--fs-sm);
  margin-top: calc(var(--s-3) * -1);
}
.login__err {
  color: var(--c-harmful);
  font-size: var(--fs-xs);
}
.login__demo {
  font-size: var(--fs-xs);
  color: var(--c-text-mute);
  text-align: center;
}
</style>
