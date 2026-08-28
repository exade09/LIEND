/** Public market metadata for Robinhood Chain ERC-20 positions. */

const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"
const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571"
const DEXSCREENER_CHUNK = 30

const WELL_KNOWN: Record<string, { symbol: string; name: string }> = {
  [WETH.toLowerCase()]: { symbol: "WETH", name: "Wrapped Ether" },
  [PONS.toLowerCase()]: { symbol: "PONS", name: "Pons" },
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

export function pickDexPair(pairs: DexPair[], contract: string): DexPair | null {
  const needle = contract.toLowerCase()
  const matches = pairs.filter((pair) => pair.baseToken?.address?.toLowerCase() === needle)
  return matches.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null
}

export function clipLabel(value: string, max: number): string {
  const trimmed = value.trim()
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function fallbackLabel(contract: string) {
  return WELL_KNOWN[contract.toLowerCase()] ?? {
    symbol: `${contract.slice(0, 6)}…${contract.slice(-4)}`,
    name: contract,
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
  ethUsd: number | null
}> {
  const unique = [...new Set(contracts)]
  const priced = unique.some((address) => address.toLowerCase() === WETH.toLowerCase())
    ? unique
    : [...unique, WETH]
  const pairs = await fetchDexPairs(priced)
  const markets = new Map<string, TokenMarket>()

  for (const contract of unique) {
    const pair = pickDexPair(pairs, contract)
    const known = WELL_KNOWN[contract.toLowerCase()]
    const fallback = fallbackLabel(contract)
    const rawPrice = Number(pair?.priceUsd)
    markets.set(contract, {
      symbol: clipLabel(pair?.baseToken?.symbol ?? known?.symbol ?? fallback.symbol, 32),
      name: clipLabel(pair?.baseToken?.name ?? known?.name ?? fallback.name, 128),
      priceUsd: Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null,
    })
  }

  const ethPair = pickDexPair(pairs, WETH)
  const rawEthUsd = Number(ethPair?.priceUsd)
  return { markets, ethUsd: Number.isFinite(rawEthUsd) && rawEthUsd > 0 ? rawEthUsd : null }
}
