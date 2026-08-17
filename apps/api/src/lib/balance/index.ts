/**
 * Trusted LIEND balance lookup.
 *
 * This is the only source the server accepts when deciding utility access.
 * A balance supplied by a client, a query parameter, or a future extension
 * message is never used for authorization.
 *
 * No production adapter exists yet: there is no configured RPC endpoint and
 * no launched token. `getLiendBalance` therefore reports `unavailable`, and
 * every caller must handle that rather than assuming zero.
 */

import { readServerEnv } from "../env"

export type BalanceLookup =
  | { status: "ok"; balance: bigint }
  /** RPC not configured, or the token has not launched. */
  | { status: "unavailable"; reason: "no-rpc" | "token-not-launched" }
  | { status: "error"; message: string }

export interface BalanceProvider {
  getTokenBalance(owner: string, mint: string): Promise<BalanceLookup>
}

/**
 * Placeholder provider. Deliberately returns `unavailable` rather than 0 so
 * that no code path can mistake "we cannot check" for "holds nothing".
 */
export const unavailableBalanceProvider: BalanceProvider = {
  async getTokenBalance(): Promise<BalanceLookup> {
    return { status: "unavailable", reason: "no-rpc" }
  },
}

let provider: BalanceProvider = unavailableBalanceProvider

/** Phase 3 installs a real RPC-backed provider here. */
export function setBalanceProvider(next: BalanceProvider): void {
  provider = next
}

export async function getLiendBalance(owner: string): Promise<BalanceLookup> {
  const env = readServerEnv()
  if (env.token.status !== "launched") {
    return { status: "unavailable", reason: "token-not-launched" }
  }
  if (!env.rpcUrl) {
    return { status: "unavailable", reason: "no-rpc" }
  }
  return provider.getTokenBalance(owner, env.token.mint)
}
