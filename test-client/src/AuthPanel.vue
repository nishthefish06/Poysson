<script setup lang="ts">
import { ref, watch } from 'vue';
import QRCode from 'qrcode';
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '../../app/module_bindings';
import { APP_LABEL, useRunner } from './config';

const props = defineProps<{ loginState?: { stage: string; email: string } }>();

const login = useReducer(reducers.login);
const verifyTotp = useReducer(reducers.verifyTotp);
const enrollTotp = useReducer(reducers.enrollTotp);
const cancelLogin = useReducer(reducers.cancelLogin);
const { error, run } = useRunner();

const email = ref('demo.employee@example.com');
const password = ref('');
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

watch(
  () => props.loginState?.stage,
  async (stage) => {
    code.value = '';
    if (stage !== 'enroll' || !props.loginState) return;
    secret.value = newSecret();
    const label = encodeURIComponent(`${APP_LABEL}:${props.loginState.email}`);
    const uri = `otpauth://totp/${label}?secret=${secret.value}&issuer=${encodeURIComponent(APP_LABEL)}&period=30&digits=6&algorithm=SHA1`;
    qr.value = await QRCode.toDataURL(uri);
  },
  { immediate: true }
);
</script>

<template>
  <section v-if="!loginState">
    <h2>Sign in</h2>
    <label>Email <input v-model="email" type="email" autocomplete="username" size="30" /></label>
    <label
      >Password <input v-model="password" type="password" autocomplete="current-password" size="30"
    /></label>
    <button @click="run('', () => login({ email, password }))">Sign in</button>
    <p class="muted">
      Demo accounts (no 2FA): demo.admin@example.com, demo.employee@example.com, with the password passed to
      <code>seed_demo_accounts</code>.
    </p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>

  <section v-else-if="loginState.stage === 'enroll'">
    <h2>Set up your authenticator app</h2>
    <p>Scan this with Google Authenticator, Authy, 1Password or similar, then enter the 6-digit code.</p>
    <img v-if="qr" :src="qr" alt="Authenticator QR code" width="200" height="200" />
    <p class="muted">
      Can't scan? Enter this setup key (time-based): <code>{{ secret }}</code>
    </p>
    <label>Code <input v-model="code" inputmode="numeric" maxlength="6" size="8" /></label>
    <button @click="run('', () => enrollTotp({ secret, code }))">Verify and finish</button>
    <button @click="cancelLogin()">Cancel</button>
    <p v-if="error" class="error">{{ error }}</p>
  </section>

  <section v-else>
    <h2>Two-factor authentication</h2>
    <p>Enter the 6-digit code from your authenticator app for {{ loginState.email }}.</p>
    <label>Code <input v-model="code" inputmode="numeric" maxlength="6" size="8" /></label>
    <button @click="run('', () => verifyTotp({ code }))">Verify</button>
    <button @click="cancelLogin()">Cancel</button>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
