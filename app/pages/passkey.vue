<script setup lang="ts">
/* Passkey registration. Tries real WebAuthn if available; falls back to a simulated ceremony. */
definePageMeta({ layout: 'auth' })
const { registerPasskey, skipPasskey, state } = useGame()
const name = ref('This device')
const phase = ref<'idle' | 'scanning' | 'done' | 'error'>('idle')
const err = ref('')

async function register() {
  phase.value = 'scanning'
  err.value = ''
  try {
    if (window.PublicKeyCredential && location.protocol === 'https:') {
      await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'NEON//IR' },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: state.value.auth.email || 'operator', displayName: state.value.player.handle },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
          timeout: 60000,
        },
      })
    } else {
      await new Promise(r => setTimeout(r, 2200)) // simulated ceremony
    }
    phase.value = 'done'
    registerPasskey(name.value || 'Passkey', navigator.platform || 'Platform authenticator')
    setTimeout(() => navigateTo('/dashboard'), 1200)
  } catch (e: unknown) {
    phase.value = 'error'
    err.value = e instanceof Error ? e.message : 'Ceremony cancelled'
  }
}
function skip() { skipPasskey(); navigateTo('/dashboard') }
</script>

<template>
  <div class="passkey">
    <div class="eyebrow eyebrow--magenta">Step 03 / 03 · Hardening</div>
    <h1 class="passkey__title">Bind a passkey</h1>
    <p class="dim">Phishing-resistant login. No codes to steal, no pushes to spam.</p>

    <div class="passkey__scanner" :class="`is-${phase}`">
      <CyberIcon name="fingerprint" :size="72" :stroke="1.2" />
      <span class="passkey__beam" aria-hidden="true" />
    </div>

    <ul class="passkey__perks mono">
      <li><CyberIcon name="check" :size="14" /> Bound to this origin — immune to look-alike domains</li>
      <li><CyberIcon name="check" :size="14" /> Private key never leaves your device</li>
      <li><CyberIcon name="check" :size="14" /> +150 XP · unlocks "Hardened" title</li>
    </ul>

    <CyberInput v-model="name" label="Passkey label" icon="key" placeholder="e.g. MacBook Touch ID" :disabled="phase === 'scanning'" />
    <p v-if="err" class="passkey__err mono">! {{ err }}</p>

    <CyberButton variant="primary" size="lg" block :loading="phase === 'scanning'" :icon="phase === 'done' ? 'check' : 'fingerprint'" :disabled="phase === 'done'" @click="register">
      {{ phase === 'done' ? 'Passkey bound' : phase === 'scanning' ? 'Touch your authenticator' : 'Create passkey' }}
    </CyberButton>
    <CyberButton variant="ghost" size="sm" @click="skip">Skip for now</CyberButton>
  </div>
</template>

<style scoped>
.passkey { display: flex; flex-direction: column; gap: var(--s-4); }
.passkey__title { font-size: var(--fs-2xl); text-transform: uppercase; }
.passkey__scanner { --c: var(--c-cyan); position: relative; align-self: center; width: 140px; height: 140px; display: grid; place-items: center; color: var(--c); border: 1px solid var(--c); background: radial-gradient(circle, color-mix(in srgb, var(--c) 15%, transparent), transparent 70%); clip-path: var(--clip-chamfer); overflow: hidden; margin: var(--s-3) 0; }
.passkey__scanner.is-done { --c: var(--c-ideal); }
.passkey__scanner.is-error { --c: var(--c-harmful); }
.passkey__beam { position: absolute; left: 0; right: 0; height: 3px; background: var(--c); box-shadow: 0 0 14px var(--c); top: -4px; opacity: 0; }
.passkey__scanner.is-scanning .passkey__beam { opacity: 1; animation: beam 1.2s ease-in-out infinite alternate; }
@keyframes beam { from { top: 8%; } to { top: 92%; } }
.passkey__perks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--s-2); font-size: 12px; color: var(--c-text-dim); }
.passkey__perks li { display: flex; gap: var(--s-2); align-items: center; }
.passkey__perks :deep(svg) { color: var(--c-ideal); }
.passkey__err { color: var(--c-harmful); font-size: var(--fs-xs); }
.passkey :deep(.cyber-btn--ghost) { align-self: center; }
</style>
