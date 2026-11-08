<script setup lang="ts">
// Step 2 (returning users): 6-digit code from the authenticator app, checked by `verify_totp`.
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

definePageMeta({ layout: 'auth', authSubtitle: 'Identity verification' });
const verifyTotp = useReducer(reducers.verifyTotp);
const cancelLogin = useReducer(reducers.cancelLogin);
const { loginEmail } = useSession();
const { error, busy, run } = useRunner();
const code = ref('');
</script>

<template>
  <form class="auth-form" @submit.prevent="run(() => verifyTotp({ code }))">
    <h2 class="auth-heading">Complete 2FA</h2>
    <p class="auth-text">
      Enter the 6-digit code from your authenticator app<template v-if="loginEmail">
        for {{ loginEmail }}</template
      >.
    </p>

    <div class="auth-field auth-field--code">
      <CyberIcon name="key" :size="15" />
      <input
        v-model="code"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        placeholder="000000"
        aria-label="6-digit code"
      />
    </div>
    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

    <button type="submit" class="auth-btn" :disabled="busy">{{ busy ? 'Verifying…' : 'Verify code' }}</button>
    <p class="auth-hint">Lost your phone? Contact IT support to reset 2FA.</p>
    <BackButton label="Back to sign in" @click="cancelLogin()" />
  </form>
</template>
