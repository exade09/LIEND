/**
 * Public market metadata for Solana SPL positions.
 *
 * Every comparison in this file is exact, and that is the whole point. An EVM
 * address is case-insensitive, so the original lowercased both sides before
 * matching. A Solana mint is base58, which IS case-sensitive - lowercasing one
 * produces a different address, so that comparison matched nothing and every
 * position came back with no price at all.
 */

const WSOL = "So11111111111111111111111111111111111111112"
const DEXSCREENER_CHUNK = 30

const WELL_KNOWN: Record<string, { symbol: string; name: string }> = {
  [WSOL]: { symbol: "SOL", name: "Wrapped SOL" },
}

type DexPair = {
  liquidity?: { usd?: number }
  priceUsd?: string
  baseToken?: { address?: string; symbol?: string; name?: string }
}

export type TokenMarket = { symbol: string; name: string; priceUsd: number | null }

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size))
  return groups
}

export function pickDexPair(pairs: DexPair[], mint: string): DexPair | null {
  // Exact, never lowercased: see the note at the top of this file.
  const matches = pairs.filter((pair) => pair.baseToken?.address === mint)
  return matches.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null
}

export function clipLabel(value: string, max: number): string {
  const trimmed = value.trim()
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function fallbackLabel(mint: string) {
  return WELL_KNOWN[mint] ?? {
    symbol: `${mint.slice(0, 4)}…${mint.slice(-4)}`,
    name: mint,
  }
}

async function fetchDexPairs(contracts: string[]): Promise<DexPair[]> {
  const pairs: DexPair[] = []
  for (const group of chunks(contracts, DEXSCREENER_CHUNK)) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${group.join(",")}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) continue
      const body = await response.json() as { pairs?: DexPair[] | null }
      if (Array.isArray(body.pairs)) pairs.push(...body.pairs)
    } catch {
      // Missing price metadata never invalidates an onchain balance.
    }
  }
  return pairs
}

export async function loadTokenMarkets(contracts: string[]): Promise<{
  markets: Map<string, TokenMarket>
  solUsd: number | null
}> {
  const unique = [...new Set(contracts)]
  // SOL is always priced, because every borrow figure is denominated in it.
  const priced = unique.includes(WSOL) ? unique : [...unique, WSOL]
  const pairs = await fetchDexPairs(priced)
  const markets = new Map<string, TokenMarket>()

  for (const contract of unique) {
    const pair = pickDexPair(pairs, contract)
    const known = WELL_KNOWN[contract]
    const fallback = fallbackLabel(contract)
    const rawPrice = Number(pair?.priceUsd)
    markets.set(contract, {
      symbol: clipLabel(pair?.baseToken?.symbol ?? known?.symbol ?? fallback.symbol, 32),
      name: clipLabel(pair?.baseToken?.name ?? known?.name ?? fallback.name, 128),
      priceUsd: Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null,
    })
  }

  const solPair = pickDexPair(pairs, WSOL)
  const rawSolUsd = Number(solPair?.priceUsd)
  return { markets, solUsd: Number.isFinite(rawSolUsd) && rawSolUsd > 0 ? rawSolUsd : null }
}
