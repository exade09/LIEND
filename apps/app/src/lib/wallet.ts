"use client"

type EthereumProvider = {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

const CHAIN_ID_HEX = "0x1237"

function provider(): EthereumProvider | null {
  if (typeof window === "undefined") return null
  const injected = (window as Window & { ethereum?: EthereumProvider }).ethereum
  return injected?.isMetaMask && typeof injected.request === "function" ? injected : null
}

async function ensureRobinhoodChain(ethereum: EthereumProvider): Promise<void> {
  const current = await ethereum.request({ method: "eth_chainId" })
  if (current === CHAIN_ID_HEX) return
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    })
  } catch (caught) {
    if ((caught as { code?: number }).code !== 4902) throw caught
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN_ID_HEX,
        chainName: "Robinhood Chain",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
        blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
      }],
    })
  }
}

export type DiscoveredWallet = {
  name: "MetaMask"
  connect: () => Promise<{ address: string; chainId: 4663 }>
  signMessage: (message: string, address: string) => Promise<string>
}

export function discoverWallets(): DiscoveredWallet[] {
  const ethereum = provider()
  if (!ethereum) return []
  return [{
    name: "MetaMask",
    async connect() {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[]
      const address = accounts[0]
      if (!address) throw new Error("MetaMask returned no account")
      await ensureRobinhoodChain(ethereum)
      return { address, chainId: 4663 }
    },
    async signMessage(message, address) {
      return ethereum.request({
        method: "personal_sign",
        params: [message, address],
      }) as Promise<string>
    },
  }]
}

export async function signWithSessionWallet(address: string, message: string): Promise<string> {
  const wallet = discoverWallets()[0]
  if (!wallet) throw new Error("MetaMask was not detected in this browser")
  const connected = await wallet.connect()
  if (connected.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error("Connect the same MetaMask account you signed in with")
  }
  return wallet.signMessage(message, connected.address)
}
