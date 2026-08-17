"use client"

import Link from "next/link"
import { useSession } from "@/components/SessionProvider"
import { UtilityBadge } from "@/components/UtilityGate"

/**
 * Dashboard.
 *
 * Designed to read as complete during pre-launch rather than as a broken
 * version of a later product. Every metric renders from an explicit
 * availability state, so a placeholder can never be mistaken for a real
 * balance — and we never print a fake `$0`, which would imply a measured
 * value of zero rather than "no data source".
 */
export default function DashboardPage() {
  const { access, authenticated, apiConfigured, loading, wallet } = useSession()

  const unavailableReason = !apiConfigured
    ? "API not configured"
    : !authenticated
      ? "Connect a wallet"
      : access.state === "token-not-launched"
        ? "Awaiting launch"
        : access.state !== "eligible"
          ? "Utility locked"
          : "Not available"

  const metrics = [
    { label: "Position value", hint: "Requires a price source" },
    { label: "Available liquidity", hint: "Requires the LIEND program" },
    { label: "Outstanding debt", hint: "Requires the LIEND program" },
    { label: "Active loans", hint: "Requires the LIEND program" },
  ]

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p>Your LIEND position and utility status</p>
        </div>
        {!loading && <UtilityBadge access={access} />}
      </header>

      {access.state === "token-not-launched" && (
        <div className="notice" data-tone="locked">
          <strong>LIEND utility activates after token launch</strong>
          <p>
            Your wallet is connected and verified. Borrowing against positions unlocks once the
            LIEND token is live and this wallet meets the holding requirement.
          </p>
        </div>
      )}

      {!authenticated && apiConfigured && !loading && (
        <div className="notice">
          <strong>Connect a wallet to begin</strong>
          <p>
            LIEND is non-custodial. You will sign a plain-text message to prove wallet ownership —
            no transaction, no fee.
          </p>
          <p style={{ marginTop: 14 }}>
            <Link className="button button--primary" href="/auth">
              Connect wallet
            </Link>
          </p>
        </div>
      )}

      <section className="metrics">
        {metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <p className="metric__label">{metric.label}</p>
            <p className="metric__value" data-unavailable="true">
              {unavailableReason}
            </p>
            <p className="metric__hint">{metric.hint}</p>
          </div>
        ))}
      </section>

      <section className="stack" style={{ marginTop: 34, maxWidth: 760 }}>
        <div className="panel">
          <h2>Product status</h2>
          <div className="list">
            <div className="list__row">
              <span>Wallet</span>
              <span className="muted mono">
                {wallet ? `${wallet.slice(0, 5)}…${wallet.slice(-5)}` : "Not connected"}
              </span>
            </div>
            <div className="list__row">
              <span>LIEND token</span>
              <span className="muted">Not launched</span>
            </div>
            <div className="list__row">
              <span>Utility access</span>
              <span className="muted">
                {access.state === "eligible" ? "Available" : "Activates after launch"}
              </span>
            </div>
            <div className="list__row">
              <span>Borrowing</span>
              <span className="muted">Not available yet</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Browser extension</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Connect the LIEND extension to see liquidity context while browsing supported token
            pages.
          </p>
          <p style={{ marginTop: 14, marginBottom: 0 }}>
            <Link className="button button--ghost" href="/settings/devices">
              Manage browser connections
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
