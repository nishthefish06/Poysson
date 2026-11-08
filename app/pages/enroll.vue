<script setup lang="ts">
// OWNER: Person 1 (logic, working) / UI person (styling). First login: set up the authenticator app.
// The secret is generated in the browser (the module's RNG is deterministic; see README).
import QRCode from 'qrcode';
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

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
  <main class="mx-auto mt-16 max-w-sm p-6">
    <h1 class="text-2xl font-bold">Set up your authenticator app</h1>
    <p class="mt-2 text-neutral-400">
      Scan with Google Authenticator, Authy, 1Password or similar, then enter the code.
    </p>
    <img
      v-if="qr"
      :src="qr"
      alt="Authenticator QR code"
      width="200"
      height="200"
      class="mt-4 rounded bg-white p-2"
    />
    <p class="mt-2 text-xs text-neutral-500">
      Can't scan? Setup key: <code>{{ secret }}</code>
    </p>
    <form class="mt-4 flex gap-2" @submit.prevent="run(() => enrollTotp({ secret, code }))">
      <input
        v-model="code"
        inputmode="numeric"
        maxlength="6"
        class="flex-1 rounded bg-panel px-3 py-2 font-mono tracking-widest"
      />
      <button :disabled="busy" class="rounded bg-neon-cyan px-4 py-2 font-semibold text-black">Finish</button>
    </form>
    <button class="mt-3 text-sm text-neutral-400 underline" @click="cancelLogin()">Cancel</button>
    <p v-if="error" class="mt-3 text-verdict-harmful">{{ error }}</p>
  </main>
</template>
