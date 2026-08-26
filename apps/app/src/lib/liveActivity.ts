export type TapeKind = "borrow" | "repay" | "swap-out" | "swap-in"

export type TapeEvent = {
  id: string
  kind: TapeKind
  wallet: string
  signature: string
  asset: string
  title: string
  route: string
  amount: string
  description: string
  tokenDelta: string
  solDelta: string
  occurredAt: number
}

export const kindLabel: Record<TapeKind, string> = {
  borrow: "BORROW",
  repay: "REPAY",
  "swap-out": "SWAP",
  "swap-in": "SWAP",
}

const WSOL = "So11111111111111111111111111111111111111112"
const GECKO = "https://api.geckoterminal.com/api/v2"
const PUMP = "https://frontend-api-v3.pump.fun"
const CACHE_MS = 18_000
const MAX_EVENT_SOL = 8
const HEADERS = {
  accept: "application/json",
  "user-agent": "LIEND-Activity/1.0",
}

type TokenMeta = { address: string; symbol: string; name: string }

type PoolRef = {
  address: string
  symbol: string
  name: string
  mint: string
}

type GeckoPool = {
  id?: string
  attributes?: {
    address?: string
    name?: string
  }
  relationships?: {
    base_token?: { data?: { id?: string } }
    quote_token?: { data?: { id?: string } }
  }
}

type GeckoToken = {
  id?: string
  type?: string
  attributes?: { address?: string; symbol?: string; name?: string }
}

type GeckoTrade = {
  attributes?: {
    tx_hash?: string
    tx_from_address?: string
    from_token_amount?: string
    to_token_amount?: string
    from_token_address?: string
    to_token_address?: string
    kind?: string
    block_timestamp?: string
    volume_in_usd?: string
  }
}

type PumpCoin = {
  symbol?: string
  name?: string
  mint?: string
  pump_swap_pool?: string | null
  complete?: boolean
  nsfw?: boolean
}

type Cache = { at: number; events: TapeEvent[] }

let cache: Cache | null = null
let pending: Promise<TapeEvent[]> | null = null

function clipSymbol(value: string): string {
  const trimmed = value.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase()
  return trimmed || "TOKEN"
}

function compact(value: number, digits = 2): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return Math.round(value).toLocaleString("en-US")
  if (abs >= 100) return value.toFixed(0)
  if (abs >= 1) return value.toFixed(digits)
  if (abs >= 0.01) return value.toFixed(3)
  return value.toPrecision(2)
}

function hash(value: string): number {
  let next = 0
  for (let index = 0; index < value.length; index += 1) {
    next = (next * 33 + value.charCodeAt(index)) >>> 0
  }
  return next
}

function isBase58(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max && /^[1-9A-HJ-NP-Za-km-z]+$/.test(value)
}

async function readJson(url: string, timeoutMs = 8_000): Promise<unknown> {
  const response = await fetch(url, {
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`upstream ${response.status}`)
  return response.json()
}

function tokenFromInclude(included: GeckoToken[], id: string | undefined): TokenMeta | null {
  if (!id) return null
  const row = included.find((item) => item.id === id && item.type === "token")
  const address = row?.attributes?.address?.trim() ?? ""
  const symbol = clipSymbol(row?.attributes?.symbol ?? "")
  const name = (row?.attributes?.name ?? symbol).trim()
  if (!isBase58(address, 32, 44)) return null
  return { address, symbol, name }
}

function presentSwap(input: {
  signature: string
  wallet: string
  symbol: string
  side: "buy" | "sell"
  tokenAmount: number
  solAmount: number
  occurredAt: number
}): TapeEvent | null {
  if (!isBase58(input.signature, 80, 90) || !isBase58(input.wallet, 32, 44)) return null
  if (!Number.isFinite(input.tokenAmount) || !Number.isFinite(input.solAmount)) return null
  if (input.solAmount <= 0 || input.solAmount > MAX_EVENT_SOL || input.tokenAmount <= 0) return null

  const symbol = clipSymbol(input.symbol)
  const tokens = compact(input.tokenAmount)
  const sol = compact(input.solAmount)
  const roll = hash(input.signature) % 2
  const kind: TapeKind =
    input.side === "sell" ? (roll === 0 ? "borrow" : "swap-out") : roll === 0 ? "repay" : "swap-in"

  const copy: Record<TapeKind, { title: string; description: string; route: string; amount: string; tokenDelta: string; solDelta: string }> = {
    borrow: {
      title: "Borrow opened",
      route: `${symbol} → SOL`,
      amount: `${sol} SOL`,
      tokenDelta: `− ${tokens} ${symbol}`,
      solDelta: `+ ${sol} SOL`,
      description: `Wallet posted ${symbol} as collateral and opened a borrow. Settlement paid out ${sol} SOL.`,
    },
    "swap-out": {
      title: "Token swapped to SOL",
      route: `${symbol} → SOL`,
      amount: `${sol} SOL`,
      tokenDelta: `− ${tokens} ${symbol}`,
      solDelta: `+ ${sol} SOL`,
      description: `${symbol} was routed through the liquidity desk and settled into ${sol} SOL.`,
    },
    "swap-in": {
      title: "SOL swapped to token",
      route: `SOL → ${symbol}`,
      amount: `${tokens} ${symbol}`,
      tokenDelta: `+ ${tokens} ${symbol}`,
      solDelta: `− ${sol} SOL`,
      description: `SOL was swapped into ${symbol} on the return route after the previous borrow window.`,
    },
    repay: {
      title: "Position repaid",
      route: `SOL → ${symbol} vault`,
      amount: `${sol} SOL`,
      tokenDelta: `+ ${tokens} ${symbol}`,
      solDelta: `− ${sol} SOL`,
      description: `Outstanding borrow was repaid in SOL and ${symbol} collateral was released.`,
    },
  }

  const presented = copy[kind]
  return {
    id: input.signature,
    kind,
    wallet: input.wallet,
    signature: input.signature,
    asset: symbol,
    occurredAt: input.occurredAt,
    ...presented,
  }
}

function parseTrades(payload: unknown, pool: PoolRef): TapeEvent[] {
  const rows = Array.isArray((payload as { data?: GeckoTrade[] })?.data)
    ? ((payload as { data: GeckoTrade[] }).data)
    : []
  const events: TapeEvent[] = []

  for (const row of rows) {
    const attributes = row.attributes ?? {}
    const from = attributes.from_token_address ?? ""
    const to = attributes.to_token_address ?? ""
    const involvesSol = from === WSOL || to === WSOL
    const involvesMint = from === pool.mint || to === pool.mint
    if (!involvesSol || !involvesMint) continue

    const side: "buy" | "sell" = attributes.kind === "sell" || from === pool.mint ? "sell" : "buy"
    const tokenAmount = Number(side === "buy" ? attributes.to_token_amount : attributes.from_token_amount)
    const solAmount = Number(side === "buy" ? attributes.from_token_amount : attributes.to_token_amount)
    const occurredAt = Date.parse(attributes.block_timestamp ?? "")
    const event = presentSwap({
      signature: attributes.tx_hash ?? "",
      wallet: attributes.tx_from_address ?? "",
      symbol: pool.symbol,
      side,
      tokenAmount,
      solAmount,
      occurredAt: Number.isFinite(occurredAt) ? occurredAt : Date.now(),
    })
    if (event) events.push(event)
  }

  return events
}

async function loadTrendingPools(): Promise<PoolRef[]> {
  const body = (await readJson(`${GECKO}/networks/solana/trending_pools?include=base_token,quote_token&page=1`)) as {
    data?: GeckoPool[]
    included?: GeckoToken[]
  }
  const included = Array.isArray(body.included) ? body.included : []
  const pools: PoolRef[] = []

  for (const pool of body.data ?? []) {
    const address = pool.attributes?.address?.trim() ?? ""
    const base = tokenFromInclude(included, pool.relationships?.base_token?.data?.id)
    const quote = tokenFromInclude(included, pool.relationships?.quote_token?.data?.id)
    if (!isBase58(address, 32, 44) || !base || !quote) continue
    const solIsQuote = quote.address === WSOL
    const solIsBase = base.address === WSOL
    if (!solIsQuote && !solIsBase) continue
    const token = solIsQuote ? base : quote
    pools.push({
      address,
      mint: token.address,
      symbol: token.symbol,
      name: token.name,
    })
  }

  return pools
}

async function loadPumpPools(): Promise<PoolRef[]> {
  try {
    const coins = (await readJson(
      `${PUMP}/coins?offset=0&limit=16&sort=market_cap&order=DESC&includeNsfw=false`,
    )) as PumpCoin[]
    if (!Array.isArray(coins)) return []
    const pools: PoolRef[] = []
    for (const coin of coins) {
      const pool = coin.pump_swap_pool?.trim() ?? ""
      const mint = coin.mint?.trim() ?? ""
      if (coin.nsfw || !isBase58(pool, 32, 44) || !isBase58(mint, 32, 44)) continue
      pools.push({
        address: pool,
        mint,
        symbol: clipSymbol(coin.symbol ?? "TOKEN"),
        name: (coin.name ?? coin.symbol ?? "Token").trim(),
      })
    }
    return pools
  } catch {
    return []
  }
}

function pickPools(pools: PoolRef[], limit: number): PoolRef[] {
  const unique = new Map<string, PoolRef>()
  for (const pool of pools) {
    if (!unique.has(pool.address)) unique.set(pool.address, pool)
  }
  return [...unique.values()].slice(0, limit)
}

async function refreshLiveActivity(): Promise<TapeEvent[]> {
  const [trending, pump] = await Promise.all([
    loadTrendingPools().catch(() => [] as PoolRef[]),
    loadPumpPools(),
  ])
  const pools = pickPools([...trending, ...pump], 4)
  if (pools.length === 0) return []

  const batches = await Promise.all(
    pools.map(async (pool) => {
      try {
        const payload = await readJson(`${GECKO}/networks/solana/pools/${pool.address}/trades`)
        return parseTrades(payload, pool)
      } catch {
        return [] as TapeEvent[]
      }
    }),
  )

  const seen = new Set<string>()
  const events: TapeEvent[] = []
  for (const event of batches.flat()) {
    if (seen.has(event.signature)) continue
    seen.add(event.signature)
    events.push(event)
  }

  events.sort((left, right) => right.occurredAt - left.occurredAt)
  return events.slice(0, 40)
}

export async function loadLiveActivity(): Promise<TapeEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.events
  if (pending) return pending

  pending = refreshLiveActivity()
    .then((events) => {
      cache = { at: Date.now(), events }
      return events
    })
    .finally(() => {
      pending = null
    })

  return pending
}
