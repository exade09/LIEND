import type { TapeEvent, TapeKind } from "@/data/activityTape"

/**
 * The live tape, read from pump.fun's AMM.
 *
 * It follows the program rather than any single mint, so the desk shows real
 * routes across whatever is trading right now instead of waiting for one token
 * to have volume. Every row is a real swap in the 0.1 to 3 SOL band - large
 * enough to read as a trade, small enough to be one.
 *
 * Built on parsed transactions rather than raw ones, and the difference is the
 * whole design. Assembling this from `getTransaction` costs one RPC call per
 * transaction, and only about one swap in eight clears 0.1 SOL - so filling a
 * pool the client can spend for several minutes took upwards of forty calls
 * and still came back nearly empty. Measured: twenty raw transactions yielded
 * one usable row. The parsed feed returns a hundred transactions in a single
 * request, of which sixteen were in band on the same traffic.
 *
 * Reading a swap from it is also unambiguous, which the raw form was not. Each
 * transfer names the accounts at both ends, so the trader is the fee payer and
 * the SOL leg is whichever transfer touches their wallet. Working from raw
 * balance deltas meant picking the largest movement, and on a buy the pool
 * gives up slightly more than the buyer receives because a fee is taken on the
 * way through - so the pool won that comparison, the trade was read from the
 * wrong side, and every buy came out labelled a sell.
 */

/** pump.fun's AMM. Migrated tokens trade here, which is where the size is. */
const PUMP_AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"
const WSOL = "So11111111111111111111111111111111111111112"
const DEXSCREENER = "https://api.dexscreener.com/tokens/v1/solana"

/** Only trades a reader would recognise as a trade. */
const MIN_SOL = 0.1
const MAX_SOL = 3

/** One request covers this many transactions. */
const WINDOW = 100
const POOL_SIZE = 24

/**
 * Long, because the client spends this pool slowly.
 *
 * A visitor sees one row on arrival and one more every twenty to fifty
 * seconds, so a pool of this size lasts several minutes. The cache is shared
 * by every visitor, so the cost of the tape does not grow with traffic.
 */
const CACHE_MS = 60_000

type Transfer = {
  fromUserAccount?: string
  toUserAccount?: string
  tokenAmount?: number
  amount?: number
  mint?: string
}

type ParsedTransaction = {
  type?: string
  source?: string
  signature?: string
  timestamp?: number
  feePayer?: string
  transactionError?: unknown
  tokenTransfers?: Transfer[]
  nativeTransfers?: Transfer[]
}

/** One wallet's side of one swap. */
export type Trade = {
  signature: string
  blockTime: number | null
  wallet: string
  mint: string
  tokenDelta: number
  solDelta: number
}

type Cache = { at: number; events: TapeEvent[] }
let cache: Cache | null = null
let pending: Promise<TapeEvent[]> | null = null

/**
 * The parsed feed is keyed, and the key is read from a SERVER variable.
 *
 * It is taken from the RPC URL that is already configured rather than asking
 * for the same secret twice under a second name. This module is imported only
 * by the activity-tape route, so nothing here reaches the browser - a keyed URL
 * behind NEXT_PUBLIC_ would be inlined into the client bundle and handed to
 * every visitor with the key still in it.
 */
function apiKey(): string | null {
  const explicit = process.env.LONS_HELIUS_API_KEY?.trim()
  if (explicit) return explicit

  const rpc = process.env.LONS_SOLANA_RPC_URL?.trim()
  if (!rpc) return null
  try {
    const url = new URL(rpc)
    if (!url.hostname.endsWith("helius-rpc.com")) return null
    return url.searchParams.get("api-key")?.trim() || null
  } catch {
    return null
  }
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

/**
 * The trade this transaction records, from the fee payer's side.
 *
 * Both legs are read from the same wallet, so the sign of each is the sign the
 * trader experienced: SOL out and tokens in is a buy, the reverse is a sell.
 * SOL arrives two ways depending on the route - wrapped, as an SPL transfer of
 * WSOL, or native - so both are counted.
 */
export function readTrade(tx: ParsedTransaction): Trade | null {
  if (tx?.type !== "SWAP" || tx.transactionError) return null

  const wallet = tx.feePayer
  const signature = tx.signature
  if (!wallet || !signature) return null

  let solDelta = 0
  let token: { mint: string; delta: number } | null = null

  for (const transfer of tx.tokenTransfers ?? []) {
    const amount = Number(transfer.tokenAmount ?? 0)
    if (!Number.isFinite(amount) || amount === 0 || !transfer.mint) continue
    const incoming = transfer.toUserAccount === wallet
    const outgoing = transfer.fromUserAccount === wallet
    if (!incoming && !outgoing) continue

    if (transfer.mint === WSOL) {
      solDelta += incoming ? amount : -amount
      continue
    }
    // The largest non-SOL leg the trader touched is what they traded. A route
    // that hops through a third token still ends on the one they now hold.
    const delta = incoming ? amount : -amount
    if (!token || Math.abs(delta) > Math.abs(token.delta)) {
      token = { mint: transfer.mint, delta }
    }
  }

  for (const transfer of tx.nativeTransfers ?? []) {
    const lamports = Number(transfer.amount ?? 0)
    if (!Number.isFinite(lamports) || lamports === 0) continue
    if (transfer.toUserAccount === wallet) solDelta += lamports / 1e9
    else if (transfer.fromUserAccount === wallet) solDelta -= lamports / 1e9
  }

  if (!token || solDelta === 0) return null
  // Both legs pointing the same way is not a swap - it is a transfer, a claim,
  // or something this cannot describe honestly.
  if (Math.sign(solDelta) === Math.sign(token.delta)) return null

  return {
    signature,
    blockTime: tx.timestamp ?? null,
    wallet,
    mint: token.mint,
    tokenDelta: token.delta,
    solDelta,
  }
}

/** Ticker symbols for the mints in the pool, in one call. Never required. */
async function symbolsFor(mints: string[]): Promise<Map<string, string>> {
  const symbols = new Map<string, string>()
  const unique = [...new Set(mints)].slice(0, 30)
  if (unique.length === 0) return symbols

  try {
    const response = await fetch(`${DEXSCREENER}/${unique.join(",")}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return symbols
    const body = await response.json() as Array<{ baseToken?: { address?: string; symbol?: string } }>
    for (const pair of Array.isArray(body) ? body : []) {
      const address = pair.baseToken?.address
      const symbol = pair.baseToken?.symbol?.trim()
      if (address && symbol && !symbols.has(address)) symbols.set(address, symbol.slice(0, 12))
    }
  } catch {
    // A missing ticker never invalidates a trade that happened.
  }
  return symbols
}

export function present(trade: Trade, symbol: string): TapeEvent {
  // SOL leaving the wallet bought the token; SOL arriving means it was sold.
  // The desk reads those as the repay and borrow sides of a route.
  const bought = trade.solDelta < 0
  const kind: TapeKind = bought ? "repay" : "borrow"
  const sol = Math.abs(trade.solDelta)
  const tokens = compact(Math.abs(trade.tokenDelta))

  return {
    id: trade.signature,
    kind,
    wallet: trade.wallet,
    signature: trade.signature,
    mint: trade.mint,
    asset: symbol,
    title: bought ? "Repay route detected" : "Borrow route detected",
    route: bought ? `SOL → ${symbol}` : `${symbol} → SOL`,
    amount: `${compact(sol)} SOL`,
    description: bought
      ? `A Solana wallet spent ${compact(sol)} SOL on ${symbol} through a pump.fun route. LONS marks it as repay-side activity for review`
      : `A Solana wallet took ${compact(sol)} SOL out of ${symbol} through a pump.fun route. LONS marks it as borrow-side activity for review`,
    tokenDelta: bought ? `+ ${tokens} ${symbol}` : `- ${tokens} ${symbol}`,
    nativeDelta: bought ? `- ${compact(sol)} SOL` : `+ ${compact(sol)} SOL`,
    occurredAt: trade.blockTime ? trade.blockTime * 1000 : Date.now(),
  }
}

/** Fisher-Yates. The desk is a sample of the program, not a leaderboard. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const held = out[index]
    out[index] = out[swap]
    out[swap] = held
  }
  return out
}

function shortMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`
}

export function selectTrades(transactions: ParsedTransaction[]): Trade[] {
  const trades: Trade[] = []
  for (const tx of transactions) {
    const trade = readTrade(tx)
    if (!trade) continue
    const sol = Math.abs(trade.solDelta)
    if (sol < MIN_SOL || sol > MAX_SOL) continue
    trades.push(trade)
  }
  return trades
}

async function refreshLiveActivity(): Promise<TapeEvent[]> {
  const key = apiKey()
  if (!key) return []

  const response = await fetch(
    `https://api.helius.xyz/v0/addresses/${PUMP_AMM}/transactions?api-key=${key}&limit=${WINDOW}`,
    { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000) },
  )
  if (!response.ok) throw new Error(`pump.fun feed returned ${response.status}`)

  const body = await response.json() as ParsedTransaction[]
  const trades = selectTrades(Array.isArray(body) ? body : [])
  const symbols = await symbolsFor(trades.map((trade) => trade.mint))

  return shuffle(trades)
    .slice(0, POOL_SIZE)
    .map((trade) => present(trade, symbols.get(trade.mint) ?? shortMint(trade.mint)))
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
