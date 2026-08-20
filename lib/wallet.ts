"use client"

/**
 * Wallet discovery via the Wallet Standard, with an injected-provider fallback.
 *
 * Wallets register themselves on the page, so LIEND needs no per-wallet adapter
 * list. This module only discovers, connects, and reports the address/cluster.
 * It never requests a seed phrase or private key.
 */

import type { SolanaCluster } from "@/types"

type WalletAccount = {
  address: string
  publicKey: Uint8Array
  features: readonly string[]
  chains?: readonly string[]
}

type StandardWallet = {
  name: string
  icon: string
  accounts: readonly WalletAccount[]
  chains?: readonly string[]
  features: Record<string, unknown>
}

const CONNECT = "standard:connect"
const DISCONNECT = "standard:disconnect"
const EVENTS = "standard:events"

type ConnectFeature = { connect: () => Promise<{ accounts: readonly WalletAccount[] }> }
type DisconnectFeature = { disconnect: () => Promise<void> }
type EventsFeature = {
  on: (
    event: "change",
    listener: (properties?: { accounts?: readonly WalletAccount[] }) => void,
  ) => () => void
}

type InjectedSolana = {
  isPhantom?: boolean
  isConnected?: boolean
  publicKey?: { toString: () => string } | null
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect?: () => Promise<void>
  on?: (event: "accountChanged" | "disconnect", handler: (publicKey?: { toString: () => string } | null) => void) => void
  off?: (event: "accountChanged" | "disconnect", handler: (publicKey?: { toString: () => string } | null) => void) => void
}

export type DiscoveredWallet = {
  name: string
  icon?: string
  connect: () => Promise<{ address: string; cluster?: SolanaCluster }>
  disconnect?: () => Promise<void>
  onAccountChange?: (listener: (address: string | null) => void) => () => void
}

/**
 * Wallet Standard `chains` is the set of clusters an account *can* use, not the
 * cluster currently selected in the extension. Phantom and others advertise
 * mainnet + devnet + testnet together. Prefer the product cluster when it is
 * listed; only return another cluster when it is the sole advertised one.
 */
function clusterFromChains(
  chains: readonly string[] | undefined,
  preferred: SolanaCluster = "mainnet-beta",
): SolanaCluster | undefined {
  if (!chains?.length) return undefined
  const labels = chains.map((chain) => chain.toLowerCase())
  const detected = new Set<SolanaCluster>()
  if (labels.some((chain) => chain.includes("mainnet"))) detected.add("mainnet-beta")
  if (labels.some((chain) => chain.includes("devnet"))) detected.add("devnet")
  if (labels.some((chain) => chain.includes("testnet"))) detected.add("testnet")
  if (detected.has(preferred)) return preferred
  if (detected.size === 1) return [...detected][0]
  return undefined
}

function fromStandard(wallet: StandardWallet): DiscoveredWallet {
  return {
    name: wallet.name,
    icon: wallet.icon,
    async connect() {
      const feature = wallet.features[CONNECT] as ConnectFeature
      const result = await feature.connect()
      const account = result.accounts[0] ?? wallet.accounts[0]
      if (!account) throw new Error("The wallet returned no account")
      return {
        address: account.address,
        cluster: clusterFromChains(account.chains ?? wallet.chains, "mainnet-beta"),
      }
    },
    disconnect: DISCONNECT in wallet.features
      ? async () => {
          const feature = wallet.features[DISCONNECT] as DisconnectFeature
          await feature.disconnect()
        }
      : undefined,
    onAccountChange: EVENTS in wallet.features
      ? (listener) => {
          const feature = wallet.features[EVENTS] as EventsFeature
          return feature.on("change", (properties) => {
            const account = properties?.accounts?.[0] ?? wallet.accounts[0]
            listener(account?.address ?? null)
          })
        }
      : undefined,
  }
}

function injectedSolana(): InjectedSolana | null {
  if (typeof window === "undefined") return null
  const candidate = (window as Window & { solana?: InjectedSolana; phantom?: { solana?: InjectedSolana } }).solana
    ?? (window as Window & { phantom?: { solana?: InjectedSolana } }).phantom?.solana
  if (!candidate || typeof candidate.connect !== "function") return null
  return candidate
}

function fromInjected(injected: InjectedSolana): DiscoveredWallet {
  return {
    name: injected.isPhantom ? "Phantom" : "Solana wallet",
    async connect() {
      const result = await injected.connect()
      const address = result.publicKey?.toString() ?? injected.publicKey?.toString()
      if (!address) throw new Error("The wallet returned no public key")
      return { address }
    },
    disconnect: injected.disconnect ? () => injected.disconnect!() : undefined,
    onAccountChange: injected.on
      ? (listener) => {
          const onAccount = (publicKey?: { toString: () => string } | null) => {
            listener(publicKey?.toString() ?? null)
          }
          const onDisconnect = () => listener(null)
          injected.on?.("accountChanged", onAccount)
          injected.on?.("disconnect", onDisconnect)
          return () => {
            injected.off?.("accountChanged", onAccount)
            injected.off?.("disconnect", onDisconnect)
          }
        }
      : undefined,
  }
}

/**
 * Wallets announce themselves through `wallet-standard:app-ready`.
 * Re-run on each connect attempt — extensions often inject after first paint.
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

  const standard = found
    .filter((wallet) => CONNECT in wallet.features)
    .map(fromStandard)

  const injected = injectedSolana()
  if (injected) {
    const alreadyListed = standard.some((wallet) => {
      const name = wallet.name.toLowerCase()
      return name.includes("phantom") || name === "solana wallet"
    })
    if (!alreadyListed) standard.push(fromInjected(injected))
  }

  return standard
}
