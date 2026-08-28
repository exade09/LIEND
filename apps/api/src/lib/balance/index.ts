/**
 * Trusted LIEND balance lookup.
 *
 * This is the only source the server accepts when deciding utility access.
 * A balance supplied by a client, a query parameter, or a future extension
 * message is never used for authorization.
 */

import { readServerEnv } from "../env"
import { readTokenBalance } from "../evm-rpc"

export type BalanceLookup =
  | { status: "ok"; balance: bigint }
  /** RPC not configured, or the token has not launched. */
  | { status: "unavailable"; reason: "no-rpc" | "token-not-launched" }
  | { status: "error"; message: string }

export interface BalanceProvider {
  getTokenBalance(owner: string, mint: string): Promise<BalanceLookup>
}

const rpcBalanceProvider: BalanceProvider = {
  async getTokenBalance(owner, mint) {
    try {
      const balance = await readTokenBalance(owner, mint)
      return { status: "ok", balance }
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Balance lookup failed",
      }
    }
  },
}

let provider: BalanceProvider = rpcBalanceProvider

/** Tests may swap the provider. Request handling uses the RPC implementation. */
export function setBalanceProvider(next: BalanceProvider): void {
  provider = next
}

export async function getLiendBalance(owner: string): Promise<BalanceLookup> {
  const env = readServerEnv()
  if (env.token.status !== "launched") {
    return { status: "unavailable", reason: "token-not-launched" }
  }
  return provider.getTokenBalance(owner, env.token.mint)
}
