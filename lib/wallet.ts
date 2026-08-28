"use client"

/** Minimal EIP-1193 surface exposed by MetaMask. */
type EthereumProvider = {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
  on?: (event: "accountsChanged" | "chainChanged", listener: (value: unknown) => void) => void
  removeListener?: (event: "accountsChanged" | "chainChanged", listener: (value: unknown) => void) => void
}

const ROBINHOOD_CHAIN_ID = "0x1237"

function injectedMetaMask(): EthereumProvider | null {
  if (typeof window === "undefined") return null
  const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum
  return provider?.isMetaMask && typeof provider.request === "function" ? provider : null
}

async function ensureRobinhoodChain(provider: EthereumProvider): Promise<void> {
  const current = await provider.request({ method: "eth_chainId" })
  if (current === ROBINHOOD_CHAIN_ID) return
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ROBINHOOD_CHAIN_ID }],
    })
  } catch (caught) {
    const code = (caught as { code?: number }).code
    if (code !== 4902) throw caught
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: ROBINHOOD_CHAIN_ID,
        chainName: "Robinhood Chain",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
        blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
      }],
    })
  }
}

export type DiscoveredWallet = {
  name: string
  connect: () => Promise<{ address: string; chainId: 4663 }>
  disconnect?: () => Promise<void>
  onAccountChange?: (listener: (address: string | null) => void) => () => void
}

export function discoverWallets(): DiscoveredWallet[] {
  const provider = injectedMetaMask()
  if (!provider) return []

  return [{
    name: "MetaMask",
    async connect() {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[]
      const address = accounts[0]
      if (!address) throw new Error("MetaMask returned no account")
      await ensureRobinhoodChain(provider)
      return { address, chainId: 4663 }
    },
    onAccountChange(listener) {
      if (!provider.on) return () => undefined
      const accountsChanged = (value: unknown) => {
        const accounts = Array.isArray(value) ? value as string[] : []
        listener(accounts[0] ?? null)
      }
      const chainChanged = (value: unknown) => {
        if (value !== ROBINHOOD_CHAIN_ID) listener(null)
      }
      provider.on("accountsChanged", accountsChanged)
      provider.on("chainChanged", chainChanged)
      return () => {
        provider.removeListener?.("accountsChanged", accountsChanged)
        provider.removeListener?.("chainChanged", chainChanged)
      }
    },
  }]
}
