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
 * Landing destination driven by the published CA text.
 *
 * An empty or malformed CA stays on the launch board rather than linking to a
 * coin page that does not exist. A published mint goes straight to its coin.
 */
export function pumpTokenUrl(mint: string | null | undefined): string {
  const address = mint?.trim() ?? ""
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return `${PUMP_URL}/board`
  return `${PUMP_URL}/coin/${address}`
}

export function parsePublishedCa(value: unknown): PublishedCa {
  if (!value || typeof value !== "object") return EMPTY_CA
  const record = value as { mint?: unknown; updatedAt?: unknown }
  const mint = typeof record.mint === "string" && record.mint.trim() ? record.mint.trim() : null
  const updatedAt = typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : null
  return { mint, updatedAt }
}
