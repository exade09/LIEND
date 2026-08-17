"use client"

import Link from "next/link"
import { describeUtilityAccess, type UtilityAccess } from "@liend/domain"
import { useSession } from "./SessionProvider"

/** Small status chip used across the App header and dashboard. */
export function UtilityBadge({ access }: { access: UtilityAccess }) {
  const tone =
    access.state === "eligible" ? "ok" : access.state === "disconnected" ? "idle" : "locked"
  const label =
    access.state === "eligible"
      ? "Utility available"
      : access.state === "token-not-launched"
        ? "Pre-launch"
        : access.state === "holder-check-pending"
          ? "Checking"
          : access.state === "disconnected"
            ? "Not connected"
            : access.state === "error"
              ? "Unavailable"
              : "Utility locked"

  return (
    <span className="pill" data-tone={tone}>
      {label}
    </span>
  )
}

/**
 * Wraps any privileged surface.
 *
 * Renders children only in the `eligible` state. Every other state gets an
 * explicit, truthful explanation — never a disabled-looking version of a
 * feature that would imply it exists and is merely switched off.
 *
 * This is presentation. The server independently enforces the same rule.
 */
export function UtilityGate({ children }: { children: React.ReactNode }) {
  const { loading, authenticated, access, apiConfigured } = useSession()

  if (!apiConfigured) {
    return (
      <div className="notice">
        <strong>LIEND API not configured</strong>
        <p>
          Set <code className="mono">NEXT_PUBLIC_API_URL</code> for this deployment to enable
          account and utility features.
        </p>
      </div>
    )
  }

  if (loading) return <div className="empty">Loading your LIEND access…</div>

  if (!authenticated) {
    return (
      <div className="notice">
        <strong>Connect a wallet</strong>
        <p>Connect and verify a Solana wallet to see your LIEND utility access.</p>
        <p style={{ marginTop: 12 }}>
          <Link className="button button--primary" href="/auth">
            Connect wallet
          </Link>
        </p>
      </div>
    )
  }

  if (access.state === "eligible") return <>{children}</>

  return (
    <div className="notice">
      <strong>{describeUtilityAccess(access)}</strong>
      {access.state === "token-not-launched" ? (
        <p>
          The LIEND token has not launched yet. Borrowing, positions and loans activate once the
          token is live and this wallet meets the holding requirement.
        </p>
      ) : access.state === "holder-check-pending" ? (
        <p>Your LIEND balance could not be verified yet. This does not mean you are ineligible.</p>
      ) : access.state === "not-eligible" ? (
        <p>
          {access.required === null
            ? "The required LIEND balance has not been published yet."
            : "Acquire the required LIEND balance to unlock utility for this wallet."}
        </p>
      ) : (
        <p>LIEND access could not be verified. Try again shortly.</p>
      )}
    </div>
  )
}
