<script setup lang="ts">
// OWNER: Person 1 (logic, working) / UI person (styling). First login: set up the authenticator app.
// The secret is generated in the browser (the module's RNG is deterministic; see README).
import QRCode from 'qrcode';
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

definePageMeta({ layout: 'auth' });
const APP_LABEL = 'poysson.fishing';
const enrollTotp = useReducer(reducers.enrollTotp);
const cancelLogin = useReducer(reducers.cancelLogin);
const { loginEmail } = useSession();
const { error, busy, run } = useRunner();
const code = ref('');
const secret = ref('');
const qr = ref('');

// 20 random bytes -> 32 base32 chars, the usual authenticator-app secret size.
function newSecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = '';
  let value = 0;
  let bits = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

onMounted(async () => {
  secret.value = newSecret();
  const label = encodeURIComponent(`${APP_LABEL}:${loginEmail.value}`);
  const uri = `otpauth://totp/${label}?secret=${secret.value}&issuer=${encodeURIComponent(APP_LABEL)}&period=30&digits=6&algorithm=SHA1`;
  qr.value = await QRCode.toDataURL(uri);
});
</script>

<template>
  <form class="enroll" @submit.prevent="run(() => enrollTotp({ secret, code }))">
    <div class="eyebrow eyebrow--magenta">Step 02 / 02 · Set up 2FA</div>
    <h1 class="enroll__title">Bind authenticator</h1>
    <p class="dim">Scan with Google Authenticator, Authy, 1Password or similar, then enter the code.</p>

    <img v-if="qr" :src="qr" alt="Authenticator QR code" width="180" height="180" class="enroll__qr" />
    <p class="enroll__key mono">Can't scan? Setup key: {{ secret }}</p>

    <CyberInput
      v-model="code"
      label="Code"
      icon="key"
      placeholder="123456"
      autocomplete="one-time-code"
      :error="error"
    />

    <CyberButton type="submit" variant="primary" size="lg" block :loading="busy" icon="check"
      >Finish setup</CyberButton
    >
    <CyberButton variant="ghost" size="sm" @click="cancelLogin()">Use a different account</CyberButton>
  </form>
</template>

<style scoped>
.enroll {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
.enroll__title {
  font-size: var(--fs-2xl);
  text-transform: uppercase;
}
.enroll__qr {
  align-self: center;
  background: #fff;
  padding: var(--s-2);
}
.enroll__key {
  font-size: var(--fs-xs);
  color: var(--c-text-mute);
  word-break: break-all;
  text-align: center;
}
.enroll :deep(.cyber-btn--ghost) {
  align-self: center;
}
</style>
