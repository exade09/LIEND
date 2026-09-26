import type { TapeEvent, TapeKind } from "@/data/activityTape"
import { getPublishedCa } from "@/lib/published-ca"

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

/**
 * The tape follows the published contract address, and there is no fallback.
 *
 * It briefly pointed at a constant that was pump.fun's PROGRAM id rather than
 * a mint. getSignaturesForAddress answered happily, because that program is
 * busy, but no token balance ever carries a program as its mint - so every
 * transaction was fetched and every one produced nothing. An empty tape that
 * costs fourteen RPC calls is worse than an empty tape that costs none.
 */
async function publishedMint(): Promise<string | null> {
  try {
    const published = await getPublishedCa()
    const mint = published.mint?.trim() ?? ""
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) ? mint : null
  } catch {
    return null
  }
}
const WSOL = "So11111111111111111111111111111111111111112"
/**
 * Endpoints for the tape, in the order they are tried.
 *
 * Measured against the two calls this file actually makes rather than assumed:
 * the official endpoint serves both, publicnode serves both, and ankr, drpc,
 * omniatech, onfinality and blockeden refuse outright with 403, 400, 521, 429
 * and 402. publicnode is therefore a real second chance here - though not for
 * balances, where it answers 403 and is deliberately absent.
 *
 * The keyed endpoint is read from a SERVER variable, never a NEXT_PUBLIC_ one.
 * This module is imported only by the activity-tape route, so it never reaches
 * the browser - and a keyed URL behind NEXT_PUBLIC_ would be inlined into the
 * client bundle and handed to every visitor along with the key in it.
 */
const RPC_ENDPOINTS = [
  process.env.LONS_SOLANA_RPC_URL,
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
].filter((url): url is string => Boolean(url))
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
  let lastError = "no Solana endpoint answered"
  for (const url of RPC_ENDPOINTS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) {
        lastError = `Solana RPC returned ${response.status}`
        continue
      }
      const body = await response.json() as { result?: unknown; error?: { message?: string } }
      if (body.error) {
        lastError = body.error.message ?? "Solana RPC refused the call"
        continue
      }
      return body.result
    } catch (caught) {
      lastError = caught instanceof Error ? caught.message : lastError
    }
  }
  throw new Error(lastError)
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
function movement(
  meta: { preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] },
  mint: string,
): { owner: string; delta: number } | null {
  const before = new Map<string, number>()
  const after = new Map<string, number>()

  for (const row of meta.preTokenBalances ?? []) {
    if (row.mint !== mint || !row.owner) continue
    before.set(row.owner, (before.get(row.owner) ?? 0) + Number(row.uiTokenAmount?.uiAmountString ?? 0))
  }
  for (const row of meta.postTokenBalances ?? []) {
    if (row.mint !== mint || !row.owner) continue
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
  const mint = await publishedMint()
  // No published contract means there is nothing to watch, and saying so costs
  // nothing. Inventing a address to query would cost fourteen calls to say it.
  if (!mint) return []

  const [signatures, nativePrice, tokenPrice] = await Promise.all([
    rpc("getSignaturesForAddress", [mint, { limit: SIGNATURE_WINDOW }]) as Promise<
      Array<{ signature?: string; blockTime?: number | null; err?: unknown }>
    >,
    priceOf(WSOL),
    priceOf(mint),
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
        const moved = tx?.meta ? movement(tx.meta, mint) : null
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
