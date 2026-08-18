"use client"

import Link from "next/link"
import { use } from "react"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { findLoan, sol } from "@/lib/unbacked-book"

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { book } = useUnbackedBook()
  const loan = findLoan(book, id)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Loan</h1>
          <p className="mono">{id}</p>
        </div>
      </header>
      <UtilityGate>
        {loan ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <div className="panel">
              <h2>Terms</h2>
              <div className="list">
                <div className="list__row">
                  <span>Status</span>
                  <span>{loan.status === "active" ? "Active" : "Repaid"}</span>
                </div>
                <div className="list__row">
                  <span>Collateral</span>
                  <span>
                    {loan.collateralAmount} {loan.symbol}
                  </span>
                </div>
                <div className="list__row">
                  <span>Principal</span>
                  <span>{sol(loan.principalSol)}</span>
                </div>
                <div className="list__row">
                  <span>Outstanding</span>
                  <span>{sol(loan.outstandingSol)}</span>
                </div>
                <div className="list__row">
                  <span>LTV</span>
                  <span>{(loan.ltvBps / 100).toFixed(1)}%</span>
                </div>
                <div className="list__row">
                  <span>Interest</span>
                  <span>{(loan.interestRateBps / 100).toFixed(1)}% APR</span>
                </div>
              </div>
            </div>
            <div className="row">
              <Link className="button button--ghost" href="/loans">
                Back to loans
              </Link>
              {loan.status === "active" && (
                <Link className="button button--primary" href={`/loans/${id}/repay`}>
                  Repay
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="empty">Loan not found</div>
        )}
      </UtilityGate>
    </>
  )
}
