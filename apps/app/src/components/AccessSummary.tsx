"use client"

import Link from "next/link"
import { useSession } from "./SessionProvider"
import { UtilityBadge } from "./UtilityGate"

/** Sidebar footer: who is connected and whether utility is available. */
export function AccessSummary() {
  const { loading, authenticated, wallet, access, apiConfigured, logout } = useSession()

  if (!apiConfigured) {
    return <p className="muted" style={{ marginTop: "auto" }}>API not configured</p>
  }

  if (loading) {
    return <p className="muted" style={{ marginTop: "auto" }}>Loading…</p>
  }

  return (
    <div className="stack" style={{ marginTop: "auto", gap: 10 }}>
      <UtilityBadge access={access} />
      {authenticated && wallet ? (
        <>
          <span className="mono" title={wallet}>
            {wallet.slice(0, 4)}…{wallet.slice(-4)}
          </span>
          <button className="button button--ghost" type="button" onClick={() => void logout()}>
            Disconnect
          </button>
        </>
      ) : (
        <Link className="button button--primary" href="/auth">
          Connect wallet
        </Link>
      )}
    </div>
  )
}
