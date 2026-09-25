export type TapeKind = "borrow" | "repay"

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
  nativeDelta: string
  occurredAt: number
}

export const kindLabel: Record<TapeKind, string> = {
  borrow: "BORROW",
  repay: "REPAY",
}

/**
 * The live tape, read from Solana without an indexer.
 *
 * The EVM build read this from a block explorer, which keeps a list of token
 * transfers and hands them over ready to display. Solana has no such list, and
 * rather than depend on a keyed indexer the tape is assembled from the chain
 * itself - the signatures that touched the mint, then each transaction's own
 * record of which balances moved.
 *
 * That record is `preTokenBalances` and `postTokenBalances`, which every
 * confirmed transaction carries. The owner whose balance moved furthest is the
 * wallet the event is about, and the sign of that move is its direction. No
 * parsing of instructions and no guessing at programs: the transaction states
 * its own result and this reads it.
 *
 * The cost is one call per transaction rather than one for the page, so the
 * window is deliberately small and the cache does the rest.
 */

const LONS_TOKEN = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
const WSOL = "So11111111111111111111111111111111111111112"
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com"
const DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens"
const CACHE_MS = 18_000
const MAX_EVENT_SOL = 8
/** How many signatures are asked for, and how many of them are opened. */
const SIGNATURE_WINDOW = 40
const TRANSACTION_WINDOW = 14

type TokenBalance = {
  owner?: string
  mint?: string
  uiTokenAmount?: { uiAmountString?: string; decimals?: number }
}

type Cache = { at: number; events: TapeEvent[] }
let cache: Cache | null = null
let pending: Promise<TapeEvent[]> | null = null

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
  for (let index = 0; index < value.length; index += 1) next = (next * 33 + value.charCodeAt(index)) >>> 0
  return next
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(RPC, {
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

async function priceOf(mint: string): Promise<number | null> {
  try {
    const response = await fetch(`${DEXSCREENER}/${mint}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    const body = await response.json() as { pairs?: Array<{ chainId?: string; priceUsd?: string }> }
    const pair = body.pairs?.find((row) => row.chainId === "solana")
    const price = Number(pair?.priceUsd)
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}

/**
 * The wallet this transaction was about, and how much of the mint it moved.
 *
 * A swap touches several balances - the trader, the pool, sometimes a fee
 * account - so the largest movement is the one the event describes, which is
 * the trader's side and the one a reader recognises.
 */
function movement(meta: {
  preTokenBalances?: TokenBalance[]
  postTokenBalances?: TokenBalance[]
}): { owner: string; delta: number } | null {
  const before = new Map<string, number>()
  const after = new Map<string, number>()

  for (const row of meta.preTokenBalances ?? []) {
    if (row.mint !== LONS_TOKEN || !row.owner) continue
    before.set(row.owner, (before.get(row.owner) ?? 0) + Number(row.uiTokenAmount?.uiAmountString ?? 0))
  }
  for (const row of meta.postTokenBalances ?? []) {
    if (row.mint !== LONS_TOKEN || !row.owner) continue
    after.set(row.owner, (after.get(row.owner) ?? 0) + Number(row.uiTokenAmount?.uiAmountString ?? 0))
  }

  let best: { owner: string; delta: number } | null = null
  for (const owner of new Set([...before.keys(), ...after.keys()])) {
    const delta = (after.get(owner) ?? 0) - (before.get(owner) ?? 0)
    if (!Number.isFinite(delta) || delta === 0) continue
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { owner, delta }
  }
  return best
}

function present(
  signature: string,
  blockTime: number | null,
  moved: { owner: string; delta: number },
  nativePrice: number | null,
  tokenUsd: number | null,
): TapeEvent | null {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return null

  // A balance that went down is the borrow side and one that went up is the
  // repay side. The EVM build read this from who was a contract; here the
  // direction of the move says it outright.
  const kind: TapeKind = moved.delta < 0 ? "borrow" : "repay"
  const tokenAmount = Math.abs(moved.delta)
  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return null

  const estimatedSol = nativePrice && tokenUsd ? (tokenAmount * tokenUsd) / nativePrice : null
  if (estimatedSol !== null && (estimatedSol <= 0 || estimatedSol > MAX_EVENT_SOL)) return null

  const symbol = "LONS"
  const tokens = compact(tokenAmount)
  const native = estimatedSol === null ? "onchain" : `${compact(estimatedSol)} SOL`
  const isBorrow = kind === "borrow"

  return {
    id: signature,
    kind,
    wallet: moved.owner,
    signature,
    asset: symbol,
    title: isBorrow ? "Borrow route detected" : "Repay route detected",
    route: isBorrow ? `${symbol} → SOL` : `SOL → ${symbol}`,
    amount: native,
    description: isBorrow
      ? `A Solana wallet moved ${symbol} out along a program route. LONS marks it as borrow-side activity for review`
      : `A Solana wallet received ${symbol} from a program route. LONS marks it as repay-side activity for review`,
    tokenDelta: isBorrow ? `− ${tokens} ${symbol}` : `+ ${tokens} ${symbol}`,
    nativeDelta: estimatedSol === null ? "value pending" : `${isBorrow ? "+" : "−"} ${compact(estimatedSol)} SOL`,
    occurredAt: blockTime ? blockTime * 1000 : Date.now() - (hash(signature) % 60_000),
  }
}

async function refreshLiveActivity(): Promise<TapeEvent[]> {
  const [signatures, nativePrice, tokenPrice] = await Promise.all([
    rpc("getSignaturesForAddress", [LONS_TOKEN, { limit: SIGNATURE_WINDOW }]) as Promise<
      Array<{ signature?: string; blockTime?: number | null; err?: unknown }>
    >,
    priceOf(WSOL),
    priceOf(LONS_TOKEN),
  ])

  const confirmed = (signatures ?? [])
    .filter((row) => row?.signature && !row.err)
    .slice(0, TRANSACTION_WINDOW)

  const events = await Promise.all(
    confirmed.map(async (row) => {
      try {
        const tx = await rpc("getTransaction", [
          row.signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ]) as { meta?: { preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] } } | null
        const moved = tx?.meta ? movement(tx.meta) : null
        return moved ? present(row.signature as string, row.blockTime ?? null, moved, nativePrice, tokenPrice) : null
      } catch {
        // One unreadable transaction must not empty the tape.
        return null
      }
    }),
  )

  return events
    .filter((event): event is TapeEvent => Boolean(event))
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, 40)
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
