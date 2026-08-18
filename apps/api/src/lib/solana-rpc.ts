/**
 * Solana JSON-RPC helpers. No SDK — a single POST keeps the API small and
 * avoids bundling web3.js into the serverless function.
 */

import { readServerEnv } from "./env"

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

const PUBLIC_RPC_FALLBACKS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
]

export type ParsedTokenAccount = {
  mint: string
  amountRaw: bigint
  decimals: number
}

type RpcResponse<T> = { result?: T; error?: { message?: string } }

type TokenAccountsResult = {
  value: Array<{
    account: {
      data: {
        parsed?: {
          info?: {
            mint?: string
            tokenAmount?: {
              amount?: string
              decimals?: number
              uiAmount?: number | null
            }
          }
        }
      }
    }
  }>
}

export function rpcEndpoints(): string[] {
  const configured = readServerEnv().rpcUrl
  const unique = [configured, ...PUBLIC_RPC_FALLBACKS].filter((url): url is string => Boolean(url))
  return [...new Set(unique)]
}

export async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const endpoints = rpcEndpoints()
  let lastError = "No Solana RPC endpoint responded"

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(6_000),
      })
      if (!response.ok) {
        lastError = `RPC ${response.status}`
        continue
      }
      const body = (await response.json()) as RpcResponse<T>
      if (body.error) {
        lastError = body.error.message ?? "RPC error"
        continue
      }
      if (body.result === undefined) {
        lastError = "RPC returned an empty result"
        continue
      }
      return body.result
    } catch (error) {
      lastError = error instanceof Error ? error.message : "RPC request failed"
    }
  }

  throw new Error(lastError)
}

export function parseTokenAccounts(result: TokenAccountsResult | null | undefined): ParsedTokenAccount[] {
  const accounts: ParsedTokenAccount[] = []
  for (const item of result?.value ?? []) {
    const info = item.account.data.parsed?.info
    const mint = info?.mint?.trim()
    const raw = info?.tokenAmount?.amount
    const decimals = info?.tokenAmount?.decimals
    if (!mint || !raw || decimals === undefined || !/^\d+$/.test(raw)) continue
    accounts.push({ mint, amountRaw: BigInt(raw), decimals })
  }
  return accounts
}

export function aggregateTokenAccounts(accounts: ParsedTokenAccount[]): ParsedTokenAccount[] {
  const byMint = new Map<string, ParsedTokenAccount>()
  for (const account of accounts) {
    const existing = byMint.get(account.mint)
    if (!existing) {
      byMint.set(account.mint, { ...account })
      continue
    }
    byMint.set(account.mint, {
      mint: account.mint,
      amountRaw: existing.amountRaw + account.amountRaw,
      decimals: existing.decimals,
    })
  }
  return [...byMint.values()].filter((account) => account.amountRaw > 0n && account.decimals > 0)
}

export async function readWalletTokenAccounts(owner: string): Promise<ParsedTokenAccount[]> {
  const encoding = { encoding: "jsonParsed", commitment: "confirmed" }
  const queries = [
    rpcCall<TokenAccountsResult>("getTokenAccountsByOwner", [owner, { programId: TOKEN_PROGRAM }, encoding]),
    rpcCall<TokenAccountsResult>("getTokenAccountsByOwner", [
      owner,
      { programId: TOKEN_2022_PROGRAM },
      encoding,
    ]),
  ]
  const settled = await Promise.allSettled(queries)
  const parsed: ParsedTokenAccount[] = []
  let lastError = "Token accounts could not be read"
  for (const result of settled) {
    if (result.status === "fulfilled") {
      parsed.push(...parseTokenAccounts(result.value))
    } else {
      lastError = result.reason instanceof Error ? result.reason.message : lastError
    }
  }
  if (parsed.length === 0 && settled.every((result) => result.status === "rejected")) {
    throw new Error(lastError)
  }
  return aggregateTokenAccounts(parsed)
}

export async function readTokenBalance(owner: string, mint: string): Promise<bigint> {
  const accounts = await readWalletTokenAccounts(owner)
  return accounts.find((account) => account.mint === mint)?.amountRaw ?? 0n
}
