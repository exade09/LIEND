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

type DexToken = { address?: string; symbol?: string; name?: string }

type DexPair = {
  liquidity?: { usd?: number }
  /** USD price of the BASE token. */
  priceUsd?: string
  /** Price of the base token expressed in quote-token units. */
  priceNative?: string
  baseToken?: DexToken
  quoteToken?: DexToken
}

export type TokenMarket = { symbol: string; name: string; priceUsd: number | null }

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size))
  return groups
}

function deepest(pairs: DexPair[]): DexPair | null {
  return [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null
}

export function pickDexPair(pairs: DexPair[], mint: string): DexPair | null {
  // Exact, never lowercased: see the note at the top of this file.
  return deepest(pairs.filter((pair) => pair.baseToken?.address === mint))
}

/** The deepest pair where this mint is the QUOTE side rather than the base. */
export function pickQuotePair(pairs: DexPair[], mint: string): DexPair | null {
  return deepest(pairs.filter((pair) => pair.quoteToken?.address === mint))
}

/**
 * What a pair says about one mint, whichever side of it that mint is on.
 *
 * A stablecoin is almost never the base token - it is what everything else is
 * priced against - so matching only `baseToken` left USDC and USDT with a
 * truncated mint for a symbol and no value at all, which is exactly the
 * holding a user is most likely to recognise on sight.
 *
 * On the quote side the arithmetic inverts: `priceUsd` is the USD price of the
 * base token and `priceNative` is that same base priced in quote units, so
 * their ratio is one quote token in USD.
 */
export function marketFromPairs(pairs: DexPair[], mint: string): TokenMarket | null {
  const base = pickDexPair(pairs, mint)
  if (base) {
    const price = Number(base.priceUsd)
    return {
      symbol: clipLabel(base.baseToken?.symbol ?? mint, 32),
      name: clipLabel(base.baseToken?.name ?? mint, 128),
      priceUsd: Number.isFinite(price) && price > 0 ? price : null,
    }
  }

  const quote = pickQuotePair(pairs, mint)
  if (!quote) return null

  const usd = Number(quote.priceUsd)
  const native = Number(quote.priceNative)
  const derived = Number.isFinite(usd) && Number.isFinite(native) && native > 0 ? usd / native : NaN
  return {
    symbol: clipLabel(quote.quoteToken?.symbol ?? mint, 32),
    name: clipLabel(quote.quoteToken?.name ?? mint, 128),
    priceUsd: Number.isFinite(derived) && derived > 0 ? derived : null,
  }
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

async function readJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    // Missing price metadata never invalidates an onchain balance.
    return null
  }
}

/**
 * One pair per mint, from the endpoint that actually returns one per mint.
 *
 * The legacy `/latest/dex/tokens/<a,b,c>` route answers with a flat list capped
 * at thirty PAIRS, not thirty tokens - so a batch containing one token with
 * many pools starves every other token in the request. Measured on a batch of
 * four: twenty-six of the thirty slots went to a single mint and USDC came back
 * with nothing at all, which is why a wallet of real holdings showed truncated
 * addresses instead of symbols.
 *
 * `/tokens/v1/solana/<a,b,c>` returns the best pair for each address instead,
 * which is what this needs. The old route stays as a fallback for a chunk the
 * new one cannot answer, where starvation is still better than silence.
 */
async function fetchDexPairs(contracts: string[]): Promise<DexPair[]> {
  const pairs: DexPair[] = []
  for (const group of chunks(contracts, DEXSCREENER_CHUNK)) {
    const joined = group.join(",")
    const primary = await readJson(`https://api.dexscreener.com/tokens/v1/solana/${joined}`)
    if (Array.isArray(primary) && primary.length > 0) {
      pairs.push(...primary as DexPair[])
      continue
    }
    const legacy = await readJson(`https://api.dexscreener.com/latest/dex/tokens/${joined}`) as
      { pairs?: DexPair[] | null } | null
    if (Array.isArray(legacy?.pairs)) pairs.push(...legacy.pairs)
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
    const found = marketFromPairs(pairs, contract)
    const known = WELL_KNOWN[contract]
    const fallback = fallbackLabel(contract)
    markets.set(contract, {
      symbol: clipLabel(found?.symbol ?? known?.symbol ?? fallback.symbol, 32),
      name: clipLabel(found?.name ?? known?.name ?? fallback.name, 128),
      priceUsd: found?.priceUsd ?? null,
    })
  }

  return { markets, solUsd: marketFromPairs(pairs, WSOL)?.priceUsd ?? null }
}
