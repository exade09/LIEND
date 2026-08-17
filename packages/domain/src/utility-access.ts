/**
 * UtilityAccess — a first-class product concept.
 *
 * Authentication and utility eligibility are deliberately NOT the same thing.
 * A user can connect and prove control of a wallet and still be unable to use
 * LIEND utility, because utility is holder-gated on the LIEND token.
 *
 * This is modelled as a discriminated union rather than a boolean so that no
 * surface can collapse "we don't know yet", "the token hasn't launched" and
 * "you don't hold enough" into a single misleading `false`.
 *
 * AUTHORITY: the server is the only authority. A client-side `eligible` value
 * is presentation state. Every privileged operation re-derives access on the
 * server from a trusted balance source before acting. See
 * `apps/api/src/lib/utility-access.ts`.
 */

export type UtilityAccess =
  /** No wallet connected. Nothing is known. */
  | { state: "disconnected" }
  /**
   * Wallet connected, but the LIEND token does not exist yet, so utility
   * cannot be gated or granted. This is a real product state, not a demo or
   * beta state.
   */
  | { state: "token-not-launched"; wallet: string }
  /** Token configured; balance lookup in flight. */
  | { state: "holder-check-pending"; wallet: string; mint: string }
  /**
   * Checked against a trusted source and the wallet does not meet the
   * requirement. `required` is null when the threshold is configured but not
   * yet published — we never invent a number to fill the gap.
   */
  | {
      state: "not-eligible"
      wallet: string
      mint: string
      balance: bigint
      required: bigint | null
    }
  /** Checked and eligible. Privileged utility may be offered. */
  | {
      state: "eligible"
      wallet: string
      mint: string
      balance: bigint
      required: bigint | null
    }
  /** The check itself failed. Distinct from `not-eligible` — we do not know. */
  | { state: "error"; wallet: string | null; reason: string }

export type UtilityAccessState = UtilityAccess["state"]

/** True only for the one state where privileged operations may be offered. */
export function canUseUtility(access: UtilityAccess): boolean {
  return access.state === "eligible"
}

/**
 * True when the UI should present a "resolving" affordance rather than a
 * final answer. Kept separate from `canUseUtility` so a pending check never
 * renders as a denial.
 */
export function isResolving(access: UtilityAccess): boolean {
  return access.state === "holder-check-pending"
}

/**
 * Derives access from the inputs a caller has.
 *
 * Pure and total: every combination produces an explicit state. Used by the
 * App for presentation and by the API for authorization — sharing the
 * function keeps the two from drifting apart.
 */
export function deriveUtilityAccess(input: {
  wallet: string | null
  mint: string | null
  required: bigint | null
  balance: bigint | null
}): UtilityAccess {
  const { wallet, mint, required, balance } = input

  if (!wallet) return { state: "disconnected" }
  if (!mint) return { state: "token-not-launched", wallet }
  if (balance === null) return { state: "holder-check-pending", wallet, mint }

  // Threshold not yet published. We know the balance but cannot judge it, so
  // we withhold utility rather than guessing a minimum in either direction.
  if (required === null) {
    return { state: "not-eligible", wallet, mint, balance, required: null }
  }

  return balance >= required
    ? { state: "eligible", wallet, mint, balance, required }
    : { state: "not-eligible", wallet, mint, balance, required }
}

/** Stable, user-facing copy. Truthful product states — never "beta"/"demo"/"test". */
export function describeUtilityAccess(access: UtilityAccess): string {
  switch (access.state) {
    case "disconnected":
      return "Connect a wallet to check LIEND utility access"
    case "token-not-launched":
      return "LIEND utility activates after token launch"
    case "holder-check-pending":
      return "Checking your LIEND balance"
    case "not-eligible":
      return access.required === null
        ? "The LIEND holding requirement has not been published yet"
        : "This wallet does not meet the LIEND holding requirement"
    case "eligible":
      return "LIEND utility is available for this wallet"
    case "error":
      return "LIEND access could not be verified"
  }
}
