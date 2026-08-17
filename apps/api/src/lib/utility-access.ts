/**
 * Server-side utility access — the authorization authority.
 *
 * The App renders its own UtilityAccess for presentation, but that value has
 * no authority. Any privileged operation calls `requireUtilityAccess` here,
 * which re-derives access from the server's own configuration and a trusted
 * balance source. Client state, query parameters, localStorage and future
 * extension messages are never inputs to this decision.
 */

import { deriveUtilityAccess, type UtilityAccess } from "@liend/domain"
import { getLiendBalance } from "./balance"
import { readServerEnv } from "./env"
import { ApiFailure } from "./http"

/** Serialisable form — bigint is not JSON-safe, so amounts become strings. */
export type UtilityAccessDto =
  | { state: "disconnected" }
  | { state: "token-not-launched"; wallet: string }
  | { state: "holder-check-pending"; wallet: string; mint: string }
  | { state: "not-eligible"; wallet: string; mint: string; balance: string; required: string | null }
  | { state: "eligible"; wallet: string; mint: string; balance: string; required: string | null }
  | { state: "error"; wallet: string | null; reason: string }

export function toDto(access: UtilityAccess): UtilityAccessDto {
  switch (access.state) {
    case "not-eligible":
    case "eligible":
      return {
        state: access.state,
        wallet: access.wallet,
        mint: access.mint,
        balance: access.balance.toString(),
        required: access.required === null ? null : access.required.toString(),
      }
    default:
      return access
  }
}

export async function resolveUtilityAccess(wallet: string | null): Promise<UtilityAccess> {
  if (!wallet) return { state: "disconnected" }

  const env = readServerEnv()
  if (env.token.status !== "launched") {
    return { state: "token-not-launched", wallet }
  }

  const lookup = await getLiendBalance(wallet)

  if (lookup.status === "error") {
    return { state: "error", wallet, reason: "Balance lookup failed" }
  }
  if (lookup.status === "unavailable") {
    // We genuinely cannot determine holdings. Reported as an unresolved check,
    // never as a denial and never as eligibility.
    return { state: "holder-check-pending", wallet, mint: env.token.mint }
  }

  return deriveUtilityAccess({
    wallet,
    mint: env.token.mint,
    required: env.token.minimumBalance,
    balance: lookup.balance,
  })
}

/**
 * Gate for privileged operations. Throws a typed failure unless the wallet is
 * verifiably eligible right now — pending and error states are refused.
 */
export async function requireUtilityAccess(wallet: string): Promise<void> {
  const access = await resolveUtilityAccess(wallet)
  switch (access.state) {
    case "eligible":
      return
    case "token-not-launched":
      throw new ApiFailure("token_not_launched", "LIEND utility activates after token launch")
    case "holder-check-pending":
      throw new ApiFailure("adapter_unavailable", "LIEND holdings could not be verified")
    case "not-eligible":
      throw new ApiFailure("utility_locked", "This wallet does not meet the LIEND holding requirement")
    default:
      throw new ApiFailure("forbidden", "LIEND utility is not available for this wallet")
  }
}
