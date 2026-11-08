<script setup lang="ts">
/* Fake Duo push. States: waiting → approved | denied | timeout. Auto-approves after ~6s for demos. */
definePageMeta({ layout: 'auth' })
const { approveMfa, state } = useGame()
const status = ref<'waiting' | 'approved' | 'denied' | 'timeout'>('waiting')
const remaining = ref(60)
let tick: ReturnType<typeof setInterval> | undefined
let auto: ReturnType<typeof setTimeout> | undefined

function start() {
  status.value = 'waiting'
  remaining.value = 60
  clearInterval(tick); clearTimeout(auto)
  tick = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) { status.value = 'timeout'; clearInterval(tick) }
  }, 1000)
  auto = setTimeout(approve, 6000)
}
function approve() {
  if (status.value !== 'waiting') return
  status.value = 'approved'
  clearInterval(tick); clearTimeout(auto)
  setTimeout(() => {
    approveMfa()
    navigateTo(state.value.auth.stage === 'passkey' ? '/passkey' : '/dashboard')
  }, 1100)
}
function deny() { status.value = 'denied'; clearInterval(tick); clearTimeout(auto) }
onMounted(start)
onBeforeUnmount(() => { clearInterval(tick); clearTimeout(auto) })
</script>

<template>
  <div class="verify">
    <div class="eyebrow eyebrow--magenta">Step 02 / 03 · Second factor</div>
    <h1 class="verify__title">Verify</h1>

    <div class="verify__device" :class="`is-${status}`">
      <div class="verify__rings" aria-hidden="true"><span /><span /><span /></div>
      <div class="verify__phone">
        <CyberIcon :name="status === 'approved' ? 'check' : status === 'waiting' ? 'phone' : 'x'" :size="40" :stroke="1.5" />
      </div>
    </div>

    <div class="verify__status" role="status" aria-live="polite">
      <template v-if="status === 'waiting'">
        <div class="verify__headline cursor-blink">Push sent · waiting for approval</div>
        <p class="dim">Approve the request in Duo Mobile on <b>iPhone ••42</b></p>
        <div class="verify__meta mono">
          <span>REQ #{{ Math.abs(state.auth.email.length * 7919).toString(16).toUpperCase() }}A</span>
          <span>EXPIRES {{ fmtTime(remaining) }}</span>
        </div>
      </template>
      <template v-else-if="status === 'approved'">
        <div class="verify__headline neon-cyan">Approved — access granted</div>
        <p class="dim">Routing to secure session…</p>
      </template>
      <template v-else-if="status === 'denied'">
        <div class="verify__headline verify__headline--bad">Request denied</div>
        <p class="dim">If you did not deny this, someone may be pushing you. Report it.</p>
      </template>
      <template v-else>
        <div class="verify__headline verify__headline--bad">Request timed out</div>
      </template>
    </div>

    <div class="verify__actions">
      <template v-if="status === 'waiting'">
        <CyberButton variant="primary" block icon="check" @click="approve">Simulate approve</CyberButton>
        <CyberButton variant="danger" block icon="x" @click="deny">Simulate deny</CyberButton>
      </template>
      <CyberButton v-else-if="status !== 'approved'" variant="secondary" block icon="bolt" @click="start">Send another push</CyberButton>
      <CyberButton variant="ghost" size="sm" to="/login">Use a different account</CyberButton>
    </div>
  </div>
</template>

<style scoped>
.verify { display: flex; flex-direction: column; align-items: center; gap: var(--s-5); text-align: center; }
.verify .eyebrow { align-self: flex-start; }
.verify__title { font-size: var(--fs-3xl); text-transform: uppercase; align-self: flex-start; line-height: 1; }
.verify__device { --c: var(--c-cyan); position: relative; width: 170px; height: 170px; display: grid; place-items: center; margin: var(--s-4) 0; }
.verify__device.is-approved { --c: var(--c-ideal); }
.verify__device.is-denied, .verify__device.is-timeout { --c: var(--c-harmful); }
.verify__rings span { position: absolute; inset: 35px; border: 2px solid var(--c); border-radius: 50%; animation: pulse-ring 2.4s ease-out infinite; }
.verify__rings span:nth-child(2) { animation-delay: .8s; }
.verify__rings span:nth-child(3) { animation-delay: 1.6s; }
.verify__device:not(.is-waiting) .verify__rings span { animation: none; opacity: 0; }
.verify__phone { width: 96px; height: 96px; display: grid; place-items: center; color: var(--c); border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 10%, var(--c-bg-1)); clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); box-shadow: 0 0 30px var(--c); transition: all var(--t-med); }
.verify__headline { font-family: var(--f-display); font-size: var(--fs-lg); letter-spacing: .06em; text-transform: uppercase; margin-bottom: var(--s-2); }
.verify__headline--bad { color: var(--c-harmful); }
.verify__meta { display: flex; justify-content: center; gap: var(--s-5); margin-top: var(--s-3); font-size: var(--fs-xs); color: var(--c-text-mute); letter-spacing: .1em; }
.verify__actions { width: 100%; display: flex; flex-direction: column; gap: var(--s-3); align-items: center; }
</style>
