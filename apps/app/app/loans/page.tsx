"use client"

import Link from "next/link"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { loanLabel, sol } from "@/lib/unbacked-book"

export default function LoansPage() {
  const { book } = useUnbackedBook()

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Loans</h1>
          <p>Review, active and closed LIEND loans for your wallet</p>
        </div>
      </header>
      <UtilityGate>
        {book.loans.length === 0 ? (
          <div className="empty">No loans yet. Borrow against a position to open one.</div>
        ) : (
          <div className="panel">
            <div className="list">
              {book.loans.map((loan) => (
                <Link className="list__row" href={`/loans/${loan.id}`} key={loan.id}>
                  <div>
                    <strong>{loan.symbol}</strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      {loanLabel(loan.status)}
                    </p>
                  </div>
                  <span>{sol(loan.outstandingSol)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </UtilityGate>
    </>
  )
}
