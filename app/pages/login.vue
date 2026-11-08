<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { login, state } = useGame()
const email = ref(state.value.player.email || 'operator@halcyon.io')
const password = ref('')
const loading = ref(false)
const errors = reactive({ email: '', password: '' })

async function submit() {
  errors.email = /.+@.+\..+/.test(email.value) ? '' : 'Invalid operator ID'
  errors.password = password.value.length >= 4 ? '' : 'Passphrase too short'
  if (errors.email || errors.password) return
  loading.value = true
  await login(email.value, password.value)
  loading.value = false
  navigateTo('/verify')
}
</script>

<template>
  <form class="login" @submit.prevent="submit">
    <div class="eyebrow eyebrow--magenta">Step 01 / 03 · Authenticate</div>
    <h1 class="login__title">Jack in</h1>
    <p class="dim login__sub">Operators only. All sessions are logged and anchored on-chain.</p>

    <CyberInput v-model="email" label="Operator ID" type="email" icon="user" placeholder="you@company.io" autocomplete="username" :error="errors.email" />
    <CyberInput v-model="password" label="Passphrase" type="password" icon="lock" placeholder="••••••••••" autocomplete="current-password" :error="errors.password" hint="Demo: any 4+ characters" />

    <div class="login__row">
      <label class="login__check"><input type="checkbox" checked> Trust this terminal</label>
      <a href="#" class="login__forgot" @click.prevent>Lost access?</a>
    </div>

    <CyberButton type="submit" variant="primary" size="lg" block :loading="loading" icon-right="arrow">Authenticate</CyberButton>
    <CyberButton variant="secondary" block icon="fingerprint" @click="password = 'passkey'; submit()">Sign in with passkey</CyberButton>
  </form>
</template>

<style scoped>
.login { display: flex; flex-direction: column; gap: var(--s-5); }
.login__title { font-size: var(--fs-3xl); line-height: 1; text-transform: uppercase; }
.login__sub { font-size: var(--fs-sm); margin-top: calc(var(--s-3) * -1); }
.login__row { display: flex; justify-content: space-between; font-size: var(--fs-sm); color: var(--c-text-dim); }
.login__check { display: flex; gap: var(--s-2); align-items: center; cursor: pointer; }
.login__check input { accent-color: var(--c-magenta); }
.login__forgot { font-size: var(--fs-sm); }
</style>
