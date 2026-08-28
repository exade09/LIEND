export type PublishedCa = {
  mint: string | null
  updatedAt: string | null
}

export const EMPTY_CA: PublishedCa = {
  mint: null,
  updatedAt: null,
}

export const PONS_URL = "https://www.ponsfamily.com"

/**
 * Landing pons destination driven by the published CA text.
 * Empty CA stays on the board. Any published text is appended after /coin/.
 */
export function ponsTokenUrl(contract: string | null | undefined): string {
  const address = contract?.trim() ?? ""
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return `${PONS_URL}/launchpad`
  return `${PONS_URL}/launchpad/${address}`
}

export function parsePublishedCa(value: unknown): PublishedCa {
  if (!value || typeof value !== "object") return EMPTY_CA
  const record = value as { mint?: unknown; updatedAt?: unknown }
  const mint = typeof record.mint === "string" && record.mint.trim() ? record.mint.trim() : null
  const updatedAt = typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : null
  return { mint, updatedAt }
}
