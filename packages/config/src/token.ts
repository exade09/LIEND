/**
 * LONS token configuration on Robinhood Chain.
 *
 * Contract addresses are EVM addresses. The token is explicitly modelled as
 * not launched until a verified contract address is published through env.
 */

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/

export type TokenLaunchState =
  | { status: "not-launched" }
  | { status: "launched"; mint: string; minimumBalance: bigint | null }

/**
 * `parseMint` is retained as the public API name because position URLs and
 * DTOs already use `mint`; on Robinhood Chain it validates an ERC-20 contract.
 */
export function parseMint(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return EVM_ADDRESS.test(trimmed) ? trimmed : null
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
  const contract = parseMint(rawContract)
  if (!contract) return { status: "not-launched" }
  return { status: "launched", mint: contract, minimumBalance: parseMinimumBalance(rawMinimum) }
}
