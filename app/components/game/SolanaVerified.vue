<script setup lang="ts">
/**
 * SolanaVerified: on-chain status chip for audit records / runs / reports.
 *   anchored  VERIFIED + short signature, links to the devnet explorer
 *   pending   "Anchoring…" (the memo transaction is on its way)
 *   failed    "Not anchored" (hover shows why); no link
 *   demo      "Demo data" for seeded samples; never claims verification, no link
 * `status` defaults to 'anchored' so a bare <SolanaVerified tx="…"> (styleguide) still renders.
 */
import type { AnchorState } from '~/composables/useGame'

const props = withDefaults(
  defineProps<{ tx: string; slot?: number; compact?: boolean; status?: AnchorState; error?: string }>(),
  { status: 'anchored' },
)
const live = computed(() => props.status === 'anchored' && !!props.tx)
const url = computed(() => `https://explorer.solana.com/tx/${props.tx}?cluster=devnet`)
const title = computed(() => {
  if (props.status === 'pending') return 'Writing this record\'s hash to Solana devnet…'
  if (props.status === 'failed') return `Not anchored on Solana${props.error ? `: ${props.error}` : ''}`
  if (props.status === 'demo') return 'Sample data: not anchored on Solana'
  return `Anchored on Solana devnet${props.slot ? ` · slot ${props.slot}` : ''} · open in explorer`
})
const label = computed(() => ({ anchored: 'VERIFIED', pending: 'ANCHORING…', failed: 'NOT ANCHORED', demo: 'DEMO DATA' })[props.status])
</script>

<template>
  <component
    :is="live ? 'a' : 'span'"
    class="sol-verified" :class="[`is-${status}`, { 'sol-verified--compact': compact }]"
    :href="live ? url : undefined" :target="live ? '_blank' : undefined" :rel="live ? 'noopener' : undefined"
    :title="title"
  >
    <span class="sol-verified__mark" aria-hidden="true">
      <CyberIcon :name="status === 'anchored' ? 'check' : status === 'failed' ? 'x' : status === 'pending' ? 'clock' : 'info'" :size="11" :stroke="3" />
    </span>
    <span v-if="!compact || status !== 'anchored'" class="sol-verified__text">{{ label }}</span>
    <span v-if="live" class="sol-verified__tx">{{ shortTx(tx) }}</span>
    <span class="sr-only">{{ title }}</span>
  </component>
</template>

<style scoped>
.sol-verified {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px 2px 2px;
  font-family: var(--f-mono); font-size: 10px; letter-spacing: .08em;
  color: var(--c-text-dim); text-decoration: none;
  border: 1px solid rgba(153, 69, 255, .5);
  background: linear-gradient(90deg, rgba(153, 69, 255, .15), rgba(20, 241, 149, .08));
  white-space: nowrap;
}
a.sol-verified:hover { border-color: #14f195; color: var(--c-text); text-shadow: none; }
.sol-verified__mark { width: 18px; height: 18px; display: grid; place-items: center; color: #04050a; background: linear-gradient(135deg, #9945ff, #14f195); }
.sol-verified__text { color: #0e9f6a; font-weight: 700; }
.sol-verified--compact { padding-right: 6px; }

.is-pending { border-style: dashed; }
.is-pending .sol-verified__mark { animation: sol-pulse 1s ease-in-out infinite; }
.is-pending .sol-verified__text { color: var(--c-text-dim); }
@keyframes sol-pulse { 50% { opacity: .45; } }
.is-failed { border-color: rgba(var(--rgb-harmful), .6); background: rgba(var(--rgb-harmful), .08); }
.is-failed .sol-verified__mark { background: var(--c-harmful); color: #fff; }
.is-failed .sol-verified__text { color: var(--c-harmful); }
.is-demo { border-color: var(--c-line-strong); background: transparent; }
.is-demo .sol-verified__mark { background: var(--c-line-strong); color: var(--c-text); }
.is-demo .sol-verified__text { color: var(--c-text-mute); }
</style>
