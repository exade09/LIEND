export type PublishedCa = {
  mint: string | null
  updatedAt: string | null
}

export const EMPTY_CA: PublishedCa = {
  mint: null,
  updatedAt: null,
}

export const PUMP_URL = "https://pump.fun"

/**
 * A Solana mint in base58, which is the only thing the admin console may
 * publish as a contract address.
 *
 * This lives at the store boundary rather than only at the places that use the
 * value. The console had an EVM address saved in it from before the chain port,
 * and because parsing accepted any non-empty string that address was still
 * being served from /api/ca and printed on the landing plaque, while every
 * consumer that checked the shape quietly fell back. Rejecting it here means a
 * stale or mistyped address reads as "not published yet", which is true.
 */
export const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function parseMintText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return MINT_PATTERN.test(trimmed) ? trimmed : null
}

/**
 * Landing destination driven by the published CA text.
 *
 * An empty or malformed CA stays on the launch board rather than linking to a
 * coin page that does not exist. A published mint goes straight to its coin.
 */
export function pumpTokenUrl(mint: string | null | undefined): string {
  const address = mint?.trim() ?? ""
  if (!MINT_PATTERN.test(address)) return `${PUMP_URL}/board`
  return `${PUMP_URL}/coin/${address}`
}

export function parsePublishedCa(value: unknown): PublishedCa {
  if (!value || typeof value !== "object") return EMPTY_CA
  const record = value as { mint?: unknown; updatedAt?: unknown }
  const mint = typeof record.mint === "string" ? parseMintText(record.mint) : null
  const updatedAt = typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : null
  return { mint, updatedAt }
}
