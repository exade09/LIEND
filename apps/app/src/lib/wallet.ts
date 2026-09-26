"use client"

/**
 * Solana wallets, through the provider they inject.
 *
 * The EVM build had one job the Solana build does not: making sure the wallet
 * was pointed at the right network, and adding it if it was not. Solana wallets
 * are on Solana, so `ensureSolana` has no equivalent and is gone.
 *
 * Every supported wallet exposes the same methods, so one path covers them all
 * and the list below only decides what a button is allowed to call itself.
 */

type SolanaProvider = {
  isPhantom?: boolean
  isSolflare?: boolean
  isBackpack?: boolean
  isOkxWallet?: boolean
  publicKey?: { toString(): string } | null
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString(): string } }>
  disconnect?: () => Promise<void>
  signMessage?: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>
  on?: (event: "connect" | "disconnect" | "accountChanged", listener: (value: unknown) => void) => void
  removeListener?: (event: "connect" | "disconnect" | "accountChanged", listener: (value: unknown) => void) => void
}

type SolanaWindow = Window & {
  phantom?: { solana?: SolanaProvider }
  solana?: SolanaProvider
  solflare?: SolanaProvider
  backpack?: SolanaProvider
  okxwallet?: { solana?: SolanaProvider }
}

/**
 * Ordered roughly by how many Solana holders actually have them installed.
 *
 * Every one of these injects the same three methods, so the list only decides
 * what a button is allowed to call itself. A wallet that is not installed
 * contributes nothing: `pick` returns null and it never appears.
 *
 * Phantom and OKX hang their provider off a namespace rather than the bare
 * window, so reading `window.solana` alone would find whichever of them won
 * the race to claim it and miss the other.
 */
const CANDIDATES: Array<{ name: string; pick: (win: SolanaWindow) => SolanaProvider | null | undefined }> = [
  { name: "Phantom", pick: (win) => win.phantom?.solana ?? (win.solana?.isPhantom ? win.solana : null) },
  { name: "Solflare", pick: (win) => (win.solflare?.isSolflare ? win.solflare : null) },
  { name: "Backpack", pick: (win) => (win.backpack?.isBackpack ? win.backpack : null) },
  { name: "OKX Wallet", pick: (win) => win.okxwallet?.solana ?? (win.solana?.isOkxWallet ? win.solana : null) },
]

export type DiscoveredWallet = {
  name: string
  connect: () => Promise<{ address: string; cluster: "mainnet-beta" }>
  signMessage: (message: string) => Promise<string>
  disconnect?: () => Promise<void>
  onAccountChange?: (listener: (address: string | null) => void) => () => void
}

export function discoverWallets(): DiscoveredWallet[] {
  if (typeof window === "undefined") return []
  const win = window as SolanaWindow

  return CANDIDATES.flatMap(({ name, pick }) => {
    const provider = pick(win)
    if (!provider || typeof provider.connect !== "function") return []

    return [{
      name,
      async connect() {
        const result = await provider.connect()
        const address = (result?.publicKey ?? provider.publicKey)?.toString()
        if (!address) throw new Error(`${name} returned no account`)
        return { address, cluster: "mainnet-beta" as const }
      },
      async signMessage(message: string) {
        if (!provider.signMessage) throw new Error(`${name} cannot sign messages`)
        const result = await provider.signMessage(new TextEncoder().encode(message), "utf8")
        return base58Encode(result instanceof Uint8Array ? result : result.signature)
      },
      async disconnect() {
        await provider.disconnect?.()
      },
      onAccountChange(listener) {
        if (!provider.on) return () => undefined
        const accountChanged = (value: unknown) => {
          const key = value as { toString(): string } | null
          listener(key ? key.toString() : null)
        }
        const disconnected = () => listener(null)
        provider.on("accountChanged", accountChanged)
        provider.on("disconnect", disconnected)
        return () => {
          provider.removeListener?.("accountChanged", accountChanged)
          provider.removeListener?.("disconnect", disconnected)
        }
      },
    }]
  })
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/**
 * Base58, written without BigInt so it runs under the target this bundle
 * compiles to. The carry loop is the standard one: each byte is folded into a
 * base-58 accumulator, and leading zero bytes become leading ones.
 */
export function base58Encode(raw: Uint8Array): string {
  const digits: number[] = [0]
  for (const byte of raw) {
    let carry = byte
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let out = ""
  for (let i = 0; i < raw.length && raw[i] === 0; i += 1) out += "1"
  for (let i = digits.length - 1; i >= 0; i -= 1) out += BASE58[digits[i]]
  return out
}

/**
 * Asks the wallet to sign the login challenge.
 *
 * Returned base58, which is what Solana tooling writes signatures in and what
 * the API decodes first.
 */
export async function signChallenge(walletName: string, message: string): Promise<string> {
  if (typeof window === "undefined") throw new Error("No wallet in this context")
  const win = window as SolanaWindow
  const entry = CANDIDATES.find((candidate) => candidate.name === walletName)
  const provider = entry?.pick(win)
  if (!provider?.signMessage) throw new Error(`${walletName} cannot sign messages`)

  const encoded = new TextEncoder().encode(message)
  const result = await provider.signMessage(encoded, "utf8")
  const bytes = result instanceof Uint8Array ? result : result.signature
  return base58Encode(bytes)
}

/**
 * Signs with the same wallet the session was opened from.
 *
 * On Solana the address is the public key, so the comparison is exact rather
 * than case-insensitive: base58 is case-sensitive and lowercasing an address
 * would compare two different keys.
 */
export async function signWithSessionWallet(address: string, message: string): Promise<string> {
  const wallets = discoverWallets()
  if (wallets.length === 0) throw new Error("No Solana wallet was detected in this browser")
  for (const wallet of wallets) {
    const connected = await wallet.connect()
    if (connected.address === address) return wallet.signMessage(message)
  }
  throw new Error("Connect the same wallet you signed in with")
}
