<script setup lang="ts">
// OWNER: Person 1 (logic, working) / UI person (styling). First login: set up the authenticator app.
// The secret is generated in the browser (the module's RNG is deterministic; see README).
import QRCode from 'qrcode';
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

definePageMeta({ layout: 'auth', authSubtitle: 'Set up two-factor sign-in' });
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
  <form class="auth-form" @submit.prevent="run(() => enrollTotp({ secret, code }))">
    <h2 class="auth-heading">Set up your authenticator</h2>
    <p class="auth-text">
      Scan with Google Authenticator, Authy, 1Password or similar, then enter the 6-digit code it shows.
    </p>

    <img v-if="qr" :src="qr" alt="Authenticator QR code" width="168" height="168" class="enroll-qr" />
    <p class="auth-hint enroll-key">Can't scan? Setup key: {{ secret }}</p>

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

    <button type="submit" class="auth-btn" :disabled="busy">
      {{ busy ? 'Verifying…' : 'Finish setup' }}
    </button>
    <button type="button" class="auth-link" @click="cancelLogin()">Back to sign in</button>
  </form>
</template>

<style scoped>
.enroll-qr {
  align-self: center;
  background: #fff;
  padding: 8px;
  border-radius: 8px;
}
.enroll-key {
  font-family: var(--f-mono);
  word-break: break-all;
}
</style>
