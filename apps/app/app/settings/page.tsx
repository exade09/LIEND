"use client"

import Link from "next/link"
import { readPublicConfig } from "@liend/config"
import { useSession } from "@/components/SessionProvider"
import { UtilityBadge } from "@/components/UtilityGate"

export default function SettingsPage() {
  const { wallet, authenticated, access, logout } = useSession()
  const config = readPublicConfig()

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Account, access and connected browsers</p>
        </div>
      </header>

      <div className="stack" style={{ maxWidth: 620 }}>
        <div className="panel">
          <h2>Wallet</h2>
          {authenticated && wallet ? (
            <>
              <p className="mono" style={{ margin: "6px 0 12px" }}>{wallet}</p>
              <button className="button button--ghost" type="button" onClick={() => void logout()}>
                Disconnect
              </button>
            </>
          ) : (
            <Link className="button button--primary" href="/auth">Connect wallet</Link>
          )}
        </div>

        <div className="panel">
          <h2>LIEND utility access</h2>
          <div className="row" style={{ marginTop: 8 }}>
            <UtilityBadge access={access} />
            <span className="muted">
              {config.token.status === "launched"
                ? "Holder requirement applies"
                : "Activates after token launch"}
            </span>
          </div>
        </div>

        <div className="panel">
          <h2>Browser connections</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Manage browsers paired with the LIEND extension.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link className="button button--ghost" href="/settings/devices">Manage devices</Link>
          </p>
        </div>

        <div className="panel">
          <h2>Security</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            LIEND is non-custodial. It never requests a seed phrase or private key, and never signs
            a transaction without your explicit wallet approval.
          </p>
        </div>
      </div>
    </>
  )
}
