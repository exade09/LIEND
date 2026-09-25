/** Solana SPL and Token-2022 balance reads. */

import { readServerEnv } from "./env"

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com"

/**
 * Both token programs, because the choice between them is not ours to make.
 * Newer launches mint under Token-2022, and a wallet read that asks only the
 * original program comes back empty rather than wrong - the kind of bug that
 * looks like "this wallet holds nothing".
 */
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

export type ParsedTokenAccount = {
  mint: string
  amountRaw: bigint
  decimals: number
  symbol?: string
  name?: string
}

/** The shape `jsonParsed` returns for one token account. */
type RpcTokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string
          tokenAmount?: { amount?: string; decimals?: number }
        }
      }
    }
  }
}

export function rpcEndpoints(): string[] {
  return [...new Set([readServerEnv().rpcUrl, PUBLIC_RPC].filter((url): url is string => Boolean(url)))]
}

async function call(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Solana RPC returned ${response.status}`)
  const body = await response.json() as { result?: unknown; error?: { message?: string } }
  if (body.error) throw new Error(body.error.message ?? "Solana RPC refused the call")
  return body.result
}

/**
 * Tries each configured endpoint in turn. The public one rate limits under
 * load, so a keyed endpoint set through env is used first when present.
 */
async function anyEndpoint(method: string, params: unknown[]): Promise<unknown> {
  let lastError = "Solana RPC did not respond"
  for (const url of rpcEndpoints()) {
    try {
      return await call(url, method, params)
    } catch (caught) {
      lastError = caught instanceof Error ? caught.message : lastError
    }
  }
  throw new Error(lastError)
}

/**
 * Parses the value of a getTokenAccountsByOwner response.
 *
 * A wallet can hold one mint across several token accounts, so balances are
 * summed by mint rather than the first one taken. Zero balances are dropped:
 * an empty account is a leftover, not a position.
 */
export function parseTokenAccounts(value: unknown): ParsedTokenAccount[] {
  const rows = ((value as { value?: RpcTokenAccount[] } | null)?.value ?? []) as RpcTokenAccount[]
  const byMint = new Map<string, ParsedTokenAccount>()

  for (const row of Array.isArray(rows) ? rows : []) {
    const info = row?.account?.data?.parsed?.info
    const mint = info?.mint
    const raw = info?.tokenAmount?.amount
    const decimals = Number(info?.tokenAmount?.decimals)
    if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) continue
    if (!raw || !/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) continue
    const amountRaw = BigInt(raw)
    if (amountRaw === 0n) continue

    const seen = byMint.get(mint)
    if (seen) seen.amountRaw += amountRaw
    else byMint.set(mint, { mint, amountRaw, decimals })
  }

  return [...byMint.values()]
}

export async function readTokenBalance(owner: string, mint: string): Promise<bigint> {
  const result = await anyEndpoint("getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed" },
  ])
  return parseTokenAccounts(result).find((row) => row.mint === mint)?.amountRaw ?? 0n
}

/**
 * Every token a wallet holds.
 *
 * The EVM build needed a block explorer for this, because standard JSON-RPC
 * cannot enumerate ERC-20 balances. Solana can: token accounts are real
 * accounts owned by a token program, so one call per program lists them and
 * no indexer sits between us and the chain.
 *
 * What the RPC does not return is a symbol or a name - those live in metadata
 * rather than in the token account - so both stay undefined here and are
 * filled in by the market lookup that already runs over these positions.
 */
export async function readWalletTokenAccounts(owner: string): Promise<ParsedTokenAccount[]> {
  const perProgram = await Promise.all(
    [TOKEN_PROGRAM, TOKEN_2022_PROGRAM].map(async (programId) => {
      try {
        return parseTokenAccounts(
          await anyEndpoint("getTokenAccountsByOwner", [owner, { programId }, { encoding: "jsonParsed" }]),
        )
      } catch {
        // One program being unavailable should not hide the wallet's holdings
        // under the other. A total failure is caught by the caller instead.
        return [] as ParsedTokenAccount[]
      }
    }),
  )

  const merged = new Map<string, ParsedTokenAccount>()
  for (const row of perProgram.flat()) {
    const seen = merged.get(row.mint)
    if (seen) seen.amountRaw += row.amountRaw
    else merged.set(row.mint, { ...row })
  }
  if (merged.size === 0 && perProgram.every((rows) => rows.length === 0)) {
    // Distinguish "holds nothing" from "nothing answered": one real call must
    // have succeeded for an empty answer to mean anything.
    await anyEndpoint("getTokenAccountsByOwner", [owner, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }])
  }
  return [...merged.values()]
}
