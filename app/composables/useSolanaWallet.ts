/*
 * Finds browser Solana wallets (Phantom, Solflare, Backpack… anything on the Wallet Standard)
 * and connects to read the player's public address. That's all we need: the app wallet signs
 * and pays for badge mints server-side, so the player never signs a transaction.
 */
import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'

interface ConnectFeature {
  'standard:connect': { connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }> }
}

const isSolanaWallet = (w: Wallet) =>
  'standard:connect' in w.features && w.chains.some(c => c.startsWith('solana:'))

export function useSolanaWallet() {
  const wallets = shallowRef<Wallet[]>([])
  const connecting = ref('')
  const error = ref('')

  onMounted(() => {
    const api = getWallets()
    const refresh = () => { wallets.value = api.get().filter(isSolanaWallet) }
    refresh()
    const offRegister = api.on('register', refresh)
    const offUnregister = api.on('unregister', refresh)
    onBeforeUnmount(() => { offRegister(); offUnregister() })
  })

  /** Asks the wallet to connect and returns the first Solana account's address. */
  async function connect(w: Wallet): Promise<string | null> {
    error.value = ''
    connecting.value = w.name
    try {
      const feature = (w.features as unknown as ConnectFeature)['standard:connect']
      const { accounts } = await feature.connect()
      const acct = accounts.find(a => a.chains.some(c => c.startsWith('solana:'))) ?? accounts[0]
      if (!acct) throw new Error('No Solana account in this wallet')
      return acct.address
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Connection cancelled'
      return null
    } finally {
      connecting.value = ''
    }
  }

  return { wallets, connect, connecting, error }
}

/** Rough client-side check for a pasted address (base58, 32-44 chars); the server validates properly. */
export const looksLikeSolanaAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim())
