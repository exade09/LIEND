export type PublishedCa = {
  mint: string | null
  updatedAt: string | null
}

export const EMPTY_CA: PublishedCa = {
  mint: null,
  updatedAt: null,
}

export const PUMP_FUN_BOARD_URL = "https://pump.fun"
export const PUMP_FUN_COIN_PREFIX = "https://pump.fun/coin/"

/**
 * Landing Pump.fun destination driven by the published CA text.
 * Empty CA stays on the board. Any published text is appended after /coin/.
 */
export function pumpFunCoinUrl(mint: string | null | undefined): string {
  const slug = mint?.trim() ?? ""
  if (!slug) return PUMP_FUN_BOARD_URL
  return `${PUMP_FUN_COIN_PREFIX}${slug}`
}

export function parsePublishedCa(value: unknown): PublishedCa {
  if (!value || typeof value !== "object") return EMPTY_CA
  const record = value as { mint?: unknown; updatedAt?: unknown }
  const mint = typeof record.mint === "string" && record.mint.trim() ? record.mint.trim() : null
  const updatedAt = typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : null
  return { mint, updatedAt }
}
