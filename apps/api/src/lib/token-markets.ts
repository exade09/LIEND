/**
 * Market metadata for wallet positions.
 *
 * DexScreener is the public source for migrated memecoin names and USD
 * prices. Majors that DexScreener misses fall back to a short well-known map
 * and Jupiter's public price endpoint.
 */

const WSOL = "So11111111111111111111111111111111111111112"
const DEXSCREENER_CHUNK = 30

const WELL_KNOWN: Record<string, { symbol: string; name: string; usd?: number }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", name: "USD Coin", usd: 1 },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: "USDT", name: "Tether USD", usd: 1 },
  [WSOL]: { symbol: "SOL", name: "Wrapped SOL" },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: "BONK", name: "Bonk" },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: { symbol: "WIF", name: "dogwifhat" },
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": { symbol: "POPCAT", name: "POPCAT" },
}

type DexPair = {
  liquidity?: { usd?: number }
  priceUsd?: string
  baseToken?: { address?: string; symbol?: string; name?: string }
  quoteToken?: { address?: string }
}

export type TokenMarket = {
  symbol: string
  name: string
  priceUsd: number | null
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

export function pickDexPair(pairs: DexPair[], mint: string): DexPair | null {
  const needle = mint.toLowerCase()
  const matches = pairs.filter((pair) => pair.baseToken?.address?.toLowerCase() === needle)
  if (matches.length === 0) return null
  return matches.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null
}

export function clipLabel(value: string, max: number): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function fallbackLabel(mint: string): { symbol: string; name: string } {
  const known = WELL_KNOWN[mint]
  if (known) return { symbol: known.symbol, name: known.name }
  return { symbol: `${mint.slice(0, 4)}…${mint.slice(-4)}`, name: mint }
}

async function fetchDexPairs(mints: string[]): Promise<DexPair[]> {
  const pairs: DexPair[] = []
  for (const group of chunk(mints, DEXSCREENER_CHUNK)) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${group.join(",")}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) continue
      const body = (await response.json()) as { pairs?: DexPair[] | null }
      if (Array.isArray(body.pairs)) pairs.push(...body.pairs)
    } catch {
      // A missing market must not fail the whole wallet read.
    }
  }
  return pairs
}

async function fetchJupiterPrices(mints: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  if (mints.length === 0) return prices
  try {
    const response = await fetch(`https://lite-api.jup.ag/price/v2?ids=${mints.join(",")}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return prices
    const body = (await response.json()) as { data?: Record<string, { price?: string } | null> }
    for (const [mint, entry] of Object.entries(body.data ?? {})) {
      const price = Number(entry?.price)
      if (Number.isFinite(price) && price > 0) prices.set(mint, price)
    }
  } catch {
    return prices
  }
  return prices
}

export async function loadTokenMarkets(mints: string[]): Promise<{ markets: Map<string, TokenMarket>; solUsd: number | null }> {
  const unique = [...new Set(mints)]
  const priced = unique.includes(WSOL) ? unique : [...unique, WSOL]
  const [pairs, jupiter] = await Promise.all([fetchDexPairs(priced), fetchJupiterPrices(priced)])

  const markets = new Map<string, TokenMarket>()
  for (const mint of unique) {
    const pair = pickDexPair(pairs, mint)
    const known = WELL_KNOWN[mint]
    const symbol = clipLabel(pair?.baseToken?.symbol ?? known?.symbol ?? "", 32) || fallbackLabel(mint).symbol
    const name = clipLabel(pair?.baseToken?.name ?? known?.name ?? "", 128) || fallbackLabel(mint).name
    const dexPrice = Number(pair?.priceUsd)
    const priceUsd =
      Number.isFinite(dexPrice) && dexPrice > 0
        ? dexPrice
        : (jupiter.get(mint) ?? known?.usd ?? null)
    markets.set(mint, { symbol, name, priceUsd })
  }

  const solPair = pickDexPair(pairs, WSOL)
  const solDex = Number(solPair?.priceUsd)
  const solUsd =
    Number.isFinite(solDex) && solDex > 0 ? solDex : (jupiter.get(WSOL) ?? null)

  return { markets, solUsd }
}
