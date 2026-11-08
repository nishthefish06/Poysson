<script setup lang="ts">
// Step 2 (returning users): 6-digit code from the authenticator app, checked by `verify_totp`.
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

definePageMeta({ layout: 'auth' });
const verifyTotp = useReducer(reducers.verifyTotp);
const cancelLogin = useReducer(reducers.cancelLogin);
const { loginEmail } = useSession();
const { error, busy, run } = useRunner();
const code = ref('');
</script>

<template>
  <form class="verify" @submit.prevent="run(() => verifyTotp({ code }))">
    <div class="eyebrow eyebrow--magenta">Step 02 / 02 · Second factor</div>
    <h1 class="verify__title">Verify</h1>
    <p class="dim">
      Enter the 6-digit code from your authenticator app for <b>{{ loginEmail }}</b
      >.
    </p>

    <CyberInput
      v-model="code"
      label="Code"
      icon="key"
      placeholder="123456"
      autocomplete="one-time-code"
      :error="error"
    />

    <CyberButton type="submit" variant="primary" size="lg" block :loading="busy" icon="check"
      >Verify code</CyberButton
    >
    <CyberButton variant="ghost" size="sm" @click="cancelLogin()">Use a different account</CyberButton>
  </form>
</template>

<style scoped>
.verify {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.verify__title {
  font-size: var(--fs-3xl);
  text-transform: uppercase;
  line-height: 1;
}
.verify :deep(.cyber-btn--ghost) {
  align-self: center;
}
</style>
