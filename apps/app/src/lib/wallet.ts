"use client"

/**
 * Wallet discovery via the Wallet Standard.
 *
 * Wallets register themselves on the page, so LIEND needs no per-wallet
 * adapter list and no wallet-specific code. We only discover, request a
 * connection, and ask the wallet to sign a message the user can read.
 *
 * NON-CUSTODIAL, enforced by construction: this module has no access to and
 * never requests a seed phrase or private key. It cannot sign anything — it
 * asks the user's wallet to sign, and the wallet shows the message first.
 */

type WalletAccount = {
  address: string
  publicKey: Uint8Array
  features: readonly string[]
}

type StandardWallet = {
  name: string
  icon: string
  accounts: readonly WalletAccount[]
  features: Record<string, unknown>
}

const CONNECT = "standard:connect"
const SIGN_MESSAGE = "solana:signMessage"

type ConnectFeature = { connect: () => Promise<{ accounts: readonly WalletAccount[] }> }
type SignMessageFeature = {
  signMessage: (input: {
    account: WalletAccount
    message: Uint8Array
  }) => Promise<readonly { signature: Uint8Array }[]>
}

export type DiscoveredWallet = {
  name: string
  icon: string
  connect: () => Promise<{ address: string }>
  signMessage: (message: string) => Promise<string>
}

/**
 * Wallets announce themselves through the `wallet-standard:app-ready` event.
 * We dispatch it and collect registrations synchronously.
 */
export function discoverWallets(): DiscoveredWallet[] {
  if (typeof window === "undefined") return []

  const found: StandardWallet[] = []
  const register = (wallet: StandardWallet) => {
    if (!found.some((entry) => entry.name === wallet.name)) found.push(wallet)
  }

  try {
    window.dispatchEvent(
      new CustomEvent("wallet-standard:app-ready", {
        detail: { register: (...wallets: StandardWallet[]) => wallets.forEach(register) },
      }),
    )
  } catch {
    return []
  }

  return found
    .filter((wallet) => CONNECT in wallet.features && SIGN_MESSAGE in wallet.features)
    .map((wallet) => ({
      name: wallet.name,
      icon: wallet.icon,
      async connect() {
        const feature = wallet.features[CONNECT] as ConnectFeature
        const result = await feature.connect()
        const account = result.accounts[0]
        if (!account) throw new Error("The wallet returned no account")
        return { address: account.address }
      },
      async signMessage(message: string) {
        const account = wallet.accounts[0]
        if (!account) throw new Error("Connect the wallet before signing")
        const feature = wallet.features[SIGN_MESSAGE] as SignMessageFeature
        const [signed] = await feature.signMessage({
          account,
          message: new TextEncoder().encode(message),
        })
        if (!signed) throw new Error("The wallet did not return a signature")
        // Base64 for transport; the server verifies with Ed25519.
        let binary = ""
        for (const byte of signed.signature) binary += String.fromCharCode(byte)
        return btoa(binary)
      },
    }))
}

/** Reconnect the session wallet and sign a readable message. */
export async function signWithSessionWallet(address: string, message: string) {
  const wallets = discoverWallets()
  if (wallets.length === 0) {
    throw new Error("No Solana wallet detected in this browser")
  }

  let lastError: Error | null = null
  for (const wallet of wallets) {
    try {
      const connected = await wallet.connect()
      if (connected.address !== address) continue
      return wallet.signMessage(message)
    } catch (caught) {
      lastError = caught instanceof Error ? caught : new Error("Wallet rejected the signature")
    }
  }

  throw lastError ?? new Error("Connect the same wallet you signed in with")
}
