"use client"

import Link from "next/link"
import { canUseUtility, describeUtilityAccess, type UtilityAccess } from "@liend/domain"
import { useSession } from "./SessionProvider"

/** Small status chip used across the App header and dashboard. */
export function UtilityBadge({ access }: { access: UtilityAccess }) {
  const tone =
    access.state === "eligible" || access.state === "token-not-launched"
      ? "ok"
      : access.state === "disconnected"
        ? "idle"
        : "locked"
  const label =
    access.state === "eligible" || access.state === "token-not-launched"
      ? "Utility available"
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
 * Renders children when the wallet may use utility, including unbacked access
 * before a mint exists. Every other state gets an explicit explanation.
 *
 * This is presentation. The server independently enforces the same rule.
 */
export function UtilityGate({ children }: { children: React.ReactNode }) {
  const { loading, authenticated, access, apiConfigured } = useSession()

  if (!apiConfigured) {
    return (
      <div className="notice">
        <strong>LONS API not configured</strong>
        <p>
          Set <code className="mono">NEXT_PUBLIC_API_URL</code> for this deployment to enable
          account and utility features
        </p>
      </div>
    )
  }

  if (loading) return <div className="empty">Loading your LONS access…</div>

  if (!authenticated) {
    return (
      <div className="notice">
        <strong>Connect a wallet</strong>
        <p>Connect and verify a Robinhood Chain wallet to see your LONS utility access</p>
        <p style={{ marginTop: 12 }}>
          <Link className="button button--primary" href="/auth">
            Connect wallet
          </Link>
        </p>
      </div>
    )
  }

  if (canUseUtility(access)) return <>{children}</>

  return (
    <div className="notice">
      <strong>{describeUtilityAccess(access)}</strong>
      {access.state === "holder-check-pending" ? (
        <p>Your LONS balance could not be verified yet. This does not mean you are ineligible</p>
      ) : access.state === "not-eligible" ? (
        <p>
          {access.required === null
            ? "The required LONS balance has not been published yet"
            : "Acquire the required LONS balance to unlock utility for this wallet"}
        </p>
      ) : (
        <p>LONS access could not be verified. Try again shortly</p>
      )}
    </div>
  )
}
