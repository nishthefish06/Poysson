<script setup lang="ts">
// Step 1: email + password via the `login` reducer. SessionGate then routes to /verify, /enroll
// or (demo accounts) /dashboard once the server updates the views.
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

definePageMeta({ layout: 'auth', authSubtitle: 'Cybersecurity & scam avoidance' });
const login = useReducer(reducers.login);
const { error, busy, run } = useRunner();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const formError = ref('');

function submit() {
  formError.value = !/.+@.+\..+/.test(email.value)
    ? 'Enter a valid email address.'
    : !password.value
      ? 'Enter your password.'
      : '';
  if (formError.value) return;
  void run(() => login({ email: email.value, password: password.value }));
}
</script>

<template>
  <form class="auth-form" novalidate @submit.prevent="submit">
    <div>
      <label class="auth-label" for="email">Email address</label>
      <div class="auth-field">
        <CyberIcon name="mail" :size="15" />
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="username"
          placeholder="you@t-mobile.com"
          @input="formError = ''"
        />
      </div>
    </div>

    <div>
      <label class="auth-label" for="password">Password</label>
      <div class="auth-field">
        <CyberIcon name="lock" :size="15" />
        <input
          id="password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••••"
          @input="formError = ''"
        />
        <button
          type="button"
          class="auth-icon-btn"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          @click="showPassword = !showPassword"
        >
          <CyberIcon name="eye" :size="15" />
        </button>
      </div>
    </div>

    <p v-if="formError || error" class="auth-error" role="alert">{{ formError || error }}</p>

    <button type="submit" class="auth-btn" :disabled="busy">{{ busy ? 'Signing in…' : 'Login' }}</button>
    <p class="auth-hint">Demo: demo.employee@example.com · demo.admin@example.com</p>
  </form>
</template>
