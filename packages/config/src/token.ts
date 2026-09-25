/**
 * LONS token configuration on Solana.
 *
 * A token is identified by its mint address. The token is explicitly modelled
 * as not launched until a verified mint is published through env.
 */

/**
 * Base58 as Solana writes it: the alphabet drops 0, O, I and l because they
 * are the four characters a person transcribing an address gets wrong. A mint
 * is 32 bytes, which is 32 to 44 characters once encoded.
 */
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export type TokenLaunchState =
  | { status: "not-launched" }
  | { status: "launched"; mint: string; minimumBalance: bigint | null }

/** Position URLs and DTOs already speak of mints, so this is now literal. */
export function parseMint(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return SOLANA_ADDRESS.test(trimmed) ? trimmed : null
}

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
  rawContract: string | undefined | null,
  rawMinimum: string | undefined | null,
): TokenLaunchState {
  const mint = parseMint(rawContract)
  if (!mint) return { status: "not-launched" }
  return { status: "launched", mint, minimumBalance: parseMinimumBalance(rawMinimum) }
}
