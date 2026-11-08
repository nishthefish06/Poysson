<script setup lang="ts">
/**
 * BadgeCredentials: connect a Solana wallet (or paste an address) and send earned badges to it
 * as soulbound Token-2022 credentials. The app wallet pays; the player only shares an address.
 */
import { BADGES } from '~/data/badges'

const { player, setWallet, mintAllBadges, refreshCredentials } = useGame()
const { wallets, connect, connecting, error: connectError } = useSolanaWallet()
const pasted = ref('')
const pasteError = ref('')
const busy = ref(false)

const minted = computed(() => Object.values(player.value.credentials ?? {}).filter(c => c.status === 'minted').length)
const earned = computed(() => player.value.badges.length)
const unminted = computed(() => player.value.badges.filter(id => player.value.credentials?.[id]?.status !== 'minted').length)
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
const explorer = computed(() => player.value.wallet ? `https://explorer.solana.com/address/${player.value.wallet}/tokens?cluster=devnet` : '')

async function use(address: string) {
  setWallet(address)
  await refreshCredentials()
}
async function connectWallet(w: (typeof wallets.value)[number]) {
  const address = await connect(w)
  if (address) await use(address)
}
async function usePasted() {
  pasteError.value = ''
  if (!looksLikeSolanaAddress(pasted.value)) {
    pasteError.value = 'That doesn\'t look like a Solana address.'
    return
  }
  await use(pasted.value.trim())
  pasted.value = ''
}
async function mintAll() {
  busy.value = true
  try { await mintAllBadges() } finally { busy.value = false }
}

onMounted(() => { if (player.value.wallet) void refreshCredentials() })
</script>

<template>
  <CyberPanel title="On-chain credentials" eyebrow="Solana devnet" accent="none">
    <p class="cred-panel__lede dim">
      Earned badges become <b>soulbound tokens</b> in your wallet: non-transferable proof of your training
      that anyone can verify, issued only by Poysson. Fees are on us.
    </p>

    <!-- not connected -->
    <div v-if="!player.wallet" class="cred-panel__connect">
      <div v-if="wallets.length" class="cred-panel__wallets">
        <CyberButton
          v-for="w in wallets" :key="w.name" size="sm" variant="secondary"
          :loading="connecting === w.name" @click="connectWallet(w)"
        >
          <img v-if="w.icon" :src="w.icon" alt="" width="16" height="16" class="cred-panel__wicon" /> {{ w.name }}
        </CyberButton>
      </div>
      <p v-else class="dim cred-panel__none">No Solana wallet found in this browser (Phantom, Solflare, Backpack). Paste an address instead:</p>
      <form class="cred-panel__paste" @submit.prevent="usePasted">
        <label class="sr-only" for="sol-addr">Solana wallet address</label>
        <input id="sol-addr" v-model="pasted" class="cred-panel__input" placeholder="Wallet address" autocomplete="off" spellcheck="false" />
        <CyberButton size="sm" type="submit">Use</CyberButton>
      </form>
      <p v-if="pasteError || connectError" class="cred-panel__err" role="alert">{{ pasteError || connectError }}</p>
    </div>

    <!-- connected -->
    <div v-else class="cred-panel__on">
      <div class="cred-panel__row">
        <span class="cred-panel__addr mono" :title="player.wallet">{{ short(player.wallet) }}</span>
        <a :href="explorer" target="_blank" rel="noopener" class="cred-panel__link">View wallet ↗</a>
        <div class="spacer" />
        <CyberButton size="sm" variant="ghost" @click="setWallet(undefined)">Disconnect</CyberButton>
      </div>
      <p class="cred-panel__count" role="status" aria-live="polite">
        <b>{{ minted }}</b> of {{ earned }} earned badges on-chain<template v-if="earned < BADGES.length"> · {{ BADGES.length - earned }} still to earn</template>
      </p>
      <CyberButton v-if="unminted" variant="primary" size="sm" icon="chain" block :loading="busy" @click="mintAll">
        Mint {{ unminted }} badge{{ unminted === 1 ? '' : 's' }} to wallet
      </CyberButton>
      <p class="dim cred-panel__note">New badges mint automatically after each run.</p>
    </div>
  </CyberPanel>
</template>

<style scoped>
.cred-panel__lede { font-size: var(--fs-sm); margin-bottom: var(--s-3); }
.cred-panel__connect, .cred-panel__on { display: flex; flex-direction: column; gap: var(--s-3); }
.cred-panel__wallets { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.cred-panel__wicon { border-radius: 4px; }
.cred-panel__none { font-size: var(--fs-sm); }
.cred-panel__paste { display: flex; gap: var(--s-2); }
.cred-panel__input {
  flex: 1; min-width: 0; height: 34px; padding: 0 var(--s-3);
  border-radius: var(--r-md); border: 2px solid var(--line-ink, var(--c-line-strong));
  background: var(--paper-2, var(--c-bg-2)); color: var(--c-text); font-family: var(--f-mono); font-size: 12px;
}
.cred-panel__input:focus { outline: none; border-color: var(--c-magenta); }
.cred-panel__err { color: var(--c-harmful); font-size: var(--fs-sm); font-weight: 700; }
.cred-panel__row { display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap; }
.cred-panel__addr { padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(153, 69, 255, .5); font-size: 12px; }
.cred-panel__link { font-size: var(--fs-sm); font-weight: 700; }
.cred-panel__count { font-size: var(--fs-sm); }
.cred-panel__note { font-size: 12px; }
</style>
