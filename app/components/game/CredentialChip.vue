<script setup lang="ts">
/**
 * CredentialChip: under an earned badge, shows whether it's on Solana as a soulbound credential.
 *   minted   "On-chain ✓" → the wallet's token account in the devnet explorer
 *   minting  "Minting…"
 *   failed   "Retry" (hover for why)
 *   none     "Mint" (only when a wallet is connected)
 */
const props = defineProps<{ badge: string }>()
const { player, mintBadge } = useGame()
const cred = computed(() => player.value.credentials?.[props.badge])
const earned = computed(() => player.value.badges.includes(props.badge))
const explorer = computed(() =>
  cred.value?.account ? `https://explorer.solana.com/address/${cred.value.account}?cluster=devnet` : '')
</script>

<template>
  <template v-if="earned && player.wallet">
    <a v-if="cred?.status === 'minted'" class="cred is-minted" :href="explorer" target="_blank" rel="noopener" title="Soulbound credential in your wallet; open in Solana explorer">
      <CyberIcon name="check" :size="10" :stroke="3" /> On-chain
    </a>
    <span v-else-if="cred?.status === 'minting'" class="cred is-minting">Minting…</span>
    <button v-else-if="cred?.status === 'failed'" class="cred is-failed" :title="cred.error" @click="mintBadge(badge)">Retry mint</button>
    <button v-else class="cred" @click="mintBadge(badge)">Mint</button>
  </template>
</template>

<style scoped>
.cred {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 6px;
  padding: 2px 8px; border-radius: 999px;
  font-family: var(--f-mono); font-size: 10px; font-weight: 700; letter-spacing: .04em;
  color: var(--c-text-dim); background: transparent; border: 1px dashed rgba(153, 69, 255, .55);
  text-decoration: none;
}
button.cred:hover { color: var(--c-text); border-style: solid; }
.is-minted { color: #0e9f6a; border: 1px solid rgba(20, 241, 149, .6); background: linear-gradient(90deg, rgba(153, 69, 255, .12), rgba(20, 241, 149, .1)); }
.is-minting { border-style: dashed; animation: cred-pulse 1s ease-in-out infinite; }
@keyframes cred-pulse { 50% { opacity: .5; } }
.is-failed { color: var(--c-harmful); border-color: rgba(var(--rgb-harmful), .6); }
</style>
