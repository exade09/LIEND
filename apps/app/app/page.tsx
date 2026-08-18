"use client"

import Link from "next/link"
import { useSession } from "@/components/SessionProvider"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { UtilityBadge, UtilityGate } from "@/components/UtilityGate"
import { availableSol, outstandingSol, positionValueUsd, sol, usd } from "@/lib/unbacked-book"

export default function DashboardPage() {
  const { access, loading, wallet } = useSession()
  const { book } = useUnbackedBook()
  const open = book.loans.filter((loan) => loan.status === "active")

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

      <UtilityGate>
        <section className="metrics">
          <div className="metric">
            <p className="metric__label">Position value</p>
            <p className="metric__value">{usd(positionValueUsd(book))}</p>
            <p className="metric__hint">{book.positions.length} supported positions</p>
          </div>
          <div className="metric">
            <p className="metric__label">Available liquidity</p>
            <p className="metric__value">{sol(availableSol(book))}</p>
            <p className="metric__hint">Against current collateral</p>
          </div>
          <div className="metric">
            <p className="metric__label">Outstanding debt</p>
            <p className="metric__value">{sol(outstandingSol(book))}</p>
            <p className="metric__hint">Across active loans</p>
          </div>
          <div className="metric">
            <p className="metric__label">Active loans</p>
            <p className="metric__value">{open.length}</p>
            <p className="metric__hint">{open.length === 1 ? "Open position" : "Open positions"}</p>
          </div>
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
                <span>Utility access</span>
                <span className="muted">Available</span>
              </div>
              <div className="list__row">
                <span>Borrowing</span>
                <span className="muted">Open</span>
              </div>
            </div>
          </div>

          <div className="row">
            <Link className="button button--primary" href="/positions">
              View positions
            </Link>
            <Link className="button button--ghost" href="/loans">
              View loans
            </Link>
          </div>
        </section>
      </UtilityGate>
    </>
  )
}
