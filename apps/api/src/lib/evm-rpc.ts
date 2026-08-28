/** Robinhood Chain ERC-20 reads. */

import { createPublicClient, defineChain, http, parseAbi, type Address } from "viem"
import { readServerEnv } from "./env"

const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com"
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api/v2"

const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [PUBLIC_RPC] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
})

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
])

export type ParsedTokenAccount = {
  mint: string
  amountRaw: bigint
  decimals: number
  symbol?: string
  name?: string
}

type BlockscoutBalance = {
  value?: string
  token?: {
    address_hash?: string
    address?: string
    decimals?: string | number | null
    symbol?: string | null
    name?: string | null
    type?: string | null
  }
}

export function rpcEndpoints(): string[] {
  return [...new Set([readServerEnv().rpcUrl, PUBLIC_RPC].filter((url): url is string => Boolean(url)))]
}

function client(url: string) {
  return createPublicClient({ chain: robinhoodChain, transport: http(url, { timeout: 8_000 }) })
}

export async function readTokenBalance(owner: string, contract: string): Promise<bigint> {
  let lastError = "Robinhood Chain RPC did not respond"
  for (const url of rpcEndpoints()) {
    try {
      return await client(url).readContract({
        address: contract as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner as Address],
      })
    } catch (caught) {
      lastError = caught instanceof Error ? caught.message : lastError
    }
  }
  throw new Error(lastError)
}

export function parseBlockscoutBalances(value: unknown): ParsedTokenAccount[] {
  const rows = Array.isArray(value)
    ? value as BlockscoutBalance[]
    : ((value as { items?: BlockscoutBalance[] } | null)?.items ?? [])

  return rows.flatMap((row) => {
    const address = row.token?.address_hash ?? row.token?.address
    const decimals = Number(row.token?.decimals)
    const raw = row.value
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return []
    if (!raw || !/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return []
    const amountRaw = BigInt(raw)
    if (amountRaw === 0n) return []
    return [{
      mint: address,
      amountRaw,
      decimals,
      symbol: row.token?.symbol?.trim() || undefined,
      name: row.token?.name?.trim() || undefined,
    }]
  })
}

/**
 * Blockscout is the official explorer linked by Robinhood Chain and exposes
 * indexed ERC-20 balances that standard JSON-RPC cannot enumerate.
 */
export async function readWalletTokenAccounts(owner: string): Promise<ParsedTokenAccount[]> {
  const response = await fetch(`${BLOCKSCOUT_API}/addresses/${owner}/token-balances`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Robinhood Chain indexer returned ${response.status}`)
  return parseBlockscoutBalances(await response.json())
}
