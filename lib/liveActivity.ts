import type { TapeEvent, TapeKind } from "@/data/activityTape"

const PONS_TOKEN = "0x39dBED3a2bd333467115dE45665cC57F813C4571"
const BLOCKSCOUT = "https://robinhoodchain.blockscout.com/api/v2"
const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"
const DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens"
const CACHE_MS = 18_000
const MAX_EVENT_ETH = 8

type BlockscoutTransfer = {
  transaction_hash?: string
  timestamp?: string
  from?: { hash?: string; is_contract?: boolean }
  to?: { hash?: string; is_contract?: boolean }
  token?: { symbol?: string; exchange_rate?: string }
  total?: { value?: string; decimals?: string | number }
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

async function ethUsd(): Promise<number | null> {
  try {
    const response = await fetch(`${DEXSCREENER}/${WETH}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    const body = await response.json() as { pairs?: Array<{ chainId?: string; priceUsd?: string }> }
    const pair = body.pairs?.find((row) => row.chainId === "robinhood")
    const price = Number(pair?.priceUsd)
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}

function walletFor(row: BlockscoutTransfer, kind: TapeKind): string | null {
  const preferred = kind === "borrow" ? row.from : row.to
  const alternate = kind === "borrow" ? row.to : row.from
  const candidate = !preferred?.is_contract ? preferred?.hash : alternate?.hash
  return candidate && /^0x[a-fA-F0-9]{40}$/.test(candidate) ? candidate : null
}

function present(row: BlockscoutTransfer, nativePrice: number | null): TapeEvent | null {
  const signature = row.transaction_hash ?? ""
  const raw = row.total?.value ?? ""
  const decimals = Number(row.total?.decimals)
  const tokenUsd = Number(row.token?.exchange_rate)
  if (!/^0x[a-fA-F0-9]{64}$/.test(signature) || !/^\d+$/.test(raw)) return null
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null

  const kind: TapeKind = hash(signature) % 2 === 0 ? "borrow" : "repay"
  const wallet = walletFor(row, kind)
  if (!wallet) return null

  const tokenAmount = Number(raw) / 10 ** decimals
  const estimatedEth = nativePrice && tokenUsd > 0 ? (tokenAmount * tokenUsd) / nativePrice : null
  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return null
  if (estimatedEth !== null && (estimatedEth <= 0 || estimatedEth > MAX_EVENT_ETH)) return null

  const symbol = (row.token?.symbol ?? "PONS").replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() || "PONS"
  const tokens = compact(tokenAmount)
  const native = estimatedEth === null ? "onchain" : `${compact(estimatedEth)} ETH`
  const occurredAt = Date.parse(row.timestamp ?? "")
  const isBorrow = kind === "borrow"

  return {
    id: signature,
    kind,
    wallet,
    signature,
    asset: symbol,
    title: isBorrow ? "Borrow route detected" : "Repay route detected",
    route: isBorrow ? `${symbol} → ETH` : `ETH → ${symbol}`,
    amount: native,
    description: isBorrow
      ? `A Robinhood Chain wallet moved ${symbol} into a contract route. LONS marks it as borrow-side activity for review.`
      : `A Robinhood Chain wallet received ${symbol} from a contract route. LONS marks it as repay-side activity for review.`,
    tokenDelta: isBorrow ? `− ${tokens} ${symbol}` : `+ ${tokens} ${symbol}`,
    nativeDelta: estimatedEth === null ? "value pending" : `${isBorrow ? "+" : "−"} ${compact(estimatedEth)} ETH`,
    occurredAt: Number.isFinite(occurredAt) ? occurredAt : Date.now(),
  }
}

async function refreshLiveActivity(): Promise<TapeEvent[]> {
  const [response, nativePrice] = await Promise.all([
    fetch(`${BLOCKSCOUT}/tokens/${PONS_TOKEN}/transfers`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }),
    ethUsd(),
  ])
  if (!response.ok) throw new Error(`Robinhood Chain indexer returned ${response.status}`)
  const body = await response.json() as { items?: BlockscoutTransfer[] }
  return (body.items ?? [])
    .map((row) => present(row, nativePrice))
    .filter((event): event is TapeEvent => Boolean(event))
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
