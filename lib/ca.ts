export type PublishedCa = {
  mint: string | null
  updatedAt: string | null
}

export const EMPTY_CA: PublishedCa = {
  mint: null,
  updatedAt: null,
}

export function parsePublishedCa(value: unknown): PublishedCa {
  if (!value || typeof value !== "object") return EMPTY_CA
  const record = value as { mint?: unknown; updatedAt?: unknown }
  const mint = typeof record.mint === "string" && record.mint.trim() ? record.mint.trim() : null
  const updatedAt = typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : null
  return { mint, updatedAt }
}
