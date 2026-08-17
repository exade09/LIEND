/**
 * LIEND token configuration.
 *
 * PRODUCT FACT (approved): the LIEND token is not launched. There is no mint
 * and no minimum holder balance yet. Both are modelled as explicitly absent
 * rather than defaulted, so no surface can accidentally render a placeholder
 * address or an invented threshold.
 *
 * When the token launches, set LIEND_TOKEN_MINT and LIEND_MIN_HOLDER_BALANCE
 * and every consumer transitions automatically.
 */

/** Base58, 32-44 chars — the Solana mint address shape. */
const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export type TokenLaunchState =
  | { status: "not-launched" }
  | { status: "launched"; mint: string; minimumBalance: bigint | null }

export function parseMint(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return BASE58_MINT.test(trimmed) ? trimmed : null
}

/**
 * Minimum balance is expressed in base units (integer string) to avoid float
 * precision loss on token amounts. Returns null when unset — callers must
 * treat that as "requirement not yet defined", never as zero.
 */
export function parseMinimumBalance(value: string | undefined | null): bigint | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) return null
  try {
    return BigInt(trimmed)
  } catch {
    return null
  }
}

export function resolveTokenLaunchState(
  rawMint: string | undefined | null,
  rawMinimum: string | undefined | null,
): TokenLaunchState {
  const mint = parseMint(rawMint)
  if (!mint) return { status: "not-launched" }
  return { status: "launched", mint, minimumBalance: parseMinimumBalance(rawMinimum) }
}
