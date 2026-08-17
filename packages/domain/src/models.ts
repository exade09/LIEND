/**
 * LIEND domain models.
 *
 * A deliberate convention runs through this file: anything that requires
 * production infrastructure LIEND does not have yet is typed as explicitly
 * absent (`null`) or wrapped in an availability union — never defaulted to 0,
 * an empty array, or a placeholder. A screen must be able to tell
 * "nothing here" apart from "we cannot know this yet".
 */

import type { TokenIdentity, WalletIdentity } from "./schemas"

/**
 * Wraps any value that depends on infrastructure which may not exist.
 *
 * This is the type-level expression of the "no fake data" rule: consumers are
 * forced to handle `unavailable` and therefore cannot accidentally render a
 * zero as though it were a real measurement.
 */
export type Availability<T> =
  | { status: "available"; value: T; asOf: number }
  | { status: "loading" }
  /** Infrastructure exists but returned nothing for this user. */
  | { status: "empty" }
  /** The required production adapter is not connected yet. */
  | { status: "unavailable"; reason: UnavailableReason }
  | { status: "error"; message: string }

export type UnavailableReason =
  | "token-not-launched"
  | "utility-locked"
  | "no-execution-adapter"
  | "no-data-adapter"
  | "not-authenticated"

export type { TokenIdentity, WalletIdentity }

/** A token balance held by a wallet. Amounts are base units as strings. */
export type Position = {
  token: TokenIdentity
  /** Raw base-unit balance. String to avoid float precision loss. */
  amount: string
  /**
   * Fiat valuation requires a price oracle, which is not connected. Null
   * until one is — never a computed placeholder.
   */
  valueUsd: string | null
  /** Whether this position can back a LIEND loan. Server-derived. */
  eligibleForBorrow: boolean
}

export type PositionSummary = {
  totalPositions: number
  /** Null until a price oracle exists. */
  totalValueUsd: string | null
  eligibleCount: number
}

export type LoanStatus = "active" | "repaid" | "liquidated" | "closed"

export type Loan = {
  id: string
  status: LoanStatus
  collateral: { token: TokenIdentity; amount: string }
  /** Borrowed principal in base units. */
  principal: string
  outstanding: string
  /**
   * These depend on the on-chain program's actual parameters, which do not
   * exist yet. Null rather than invented values.
   */
  interestRateBps: number | null
  ltvBps: number | null
  liquidationPriceUsd: string | null
  openedAt: number
  closedAt: number | null
}

export type LoanSummary = {
  activeCount: number
  totalOutstanding: string | null
}

/**
 * A borrow quote. Every field is populated by the server from the on-chain
 * program and an oracle; the client never computes these for display.
 */
export type BorrowQuote = {
  quoteId: string
  mint: string
  collateralAmount: string
  borrowAmount: string
  feeAmount: string | null
  interestRateBps: number | null
  ltvBps: number | null
  /** Quotes are short-lived and re-validated server-side at submission. */
  expiresAt: number
}

export type TransactionState =
  | { state: "idle" }
  | { state: "preparing" }
  | { state: "awaiting-signature" }
  | { state: "submitted"; signature: string }
  | { state: "pending"; signature: string }
  | { state: "confirmed"; signature: string }
  | { state: "rejected"; reason: string }
  | { state: "failed"; reason: string; signature: string | null }
  | { state: "expired" }

export type ActivityKind = "borrow" | "repayment" | "liquidation"

export type ActivityRecord = {
  id: string
  kind: ActivityKind
  signature: string | null
  occurredAt: number
  token: TokenIdentity | null
  amount: string | null
}
