<script setup lang="ts">
/**
 * SolanaVerified — "verified on-chain" chip for audit rows / reports.
 * The tx hash is mocked; wire it to a memo-program tx signature when the backend anchors logs.
 */
const props = defineProps<{ tx: string; slot?: number; compact?: boolean }>()
const url = computed(() => `https://explorer.solana.com/tx/${props.tx}?cluster=devnet`)
</script>

<template>
  <a class="sol-verified" :class="{ 'sol-verified--compact': compact }" :href="url" target="_blank" rel="noopener" :title="`Anchored on Solana devnet${slot ? ' · slot ' + slot : ''}`">
    <span class="sol-verified__mark"><CyberIcon name="check" :size="11" :stroke="3" /></span>
    <span v-if="!compact" class="sol-verified__text">VERIFIED</span>
    <span class="sol-verified__tx">{{ shortTx(tx) }}</span>
  </a>
</template>

<style scoped>
.sol-verified {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px 2px 2px;
  font-family: var(--f-mono); font-size: 10px; letter-spacing: .08em;
  color: var(--c-text-dim); text-decoration: none;
  border: 1px solid rgba(153, 69, 255, .5);
  background: linear-gradient(90deg, rgba(153, 69, 255, .15), rgba(20, 241, 149, .08));
}
.sol-verified:hover { border-color: #14f195; color: var(--c-text); text-shadow: none; }
.sol-verified__mark { width: 18px; height: 18px; display: grid; place-items: center; color: #04050a; background: linear-gradient(135deg, #9945ff, #14f195); }
.sol-verified__text { color: #14f195; font-weight: 700; }
.sol-verified--compact { padding-right: 6px; }
</style>
