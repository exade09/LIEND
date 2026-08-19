"use client"

import Link from "next/link"
import { useSession } from "./SessionProvider"

/** Header actions: positions CTA and wallet connect, matching the App chrome. */
export function AccessSummary() {
  const { loading, authenticated, wallet, apiConfigured, logout } = useSession()

  return (
    <div className="header-actions">
      {authenticated && wallet ? (
        <span className="wallet-chip" title={wallet}>
          {wallet.slice(0, 4)}…{wallet.slice(-4)}
        </span>
      ) : null}

      <Link className="button button--solid" href="/positions">
        View positions
      </Link>

      {!apiConfigured ? (
        <span className="muted">API not configured</span>
      ) : loading ? (
        <span className="muted">Loading…</span>
      ) : authenticated ? (
        <button className="button button--connect" type="button" onClick={() => void logout()}>
          Disconnect
        </button>
      ) : (
        <Link className="button button--connect" href="/auth">
          Connect wallet
        </Link>
      )}
    </div>
  )
}
