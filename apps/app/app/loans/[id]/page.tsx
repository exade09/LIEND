"use client"

import Link from "next/link"
import { use } from "react"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { findLoan, loanLabel, eth } from "@/lib/unbacked-book"

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { book } = useUnbackedBook()
  const loan = findLoan(book, id)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Loan</h1>
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
                  <span>{loanLabel(loan.status)}</span>
                </div>
                <div className="list__row">
                  <span>Collateral</span>
                  <span>
                    {loan.collateralAmount} {loan.symbol}
                  </span>
                </div>
                <div className="list__row">
                  <span>Principal</span>
                  <span>{eth(loan.principalEth)}</span>
                </div>
                <div className="list__row">
                  <span>Outstanding</span>
                  <span>{eth(loan.outstandingEth)}</span>
                </div>
                <div className="list__row">
                  <span>LTV</span>
                  <span>{(loan.ltvBps / 100).toFixed(1)}%</span>
                </div>
                <div className="list__row">
                  <span>Interest</span>
                  <span>{(loan.interestRateBps / 100).toFixed(1)}% APR</span>
                </div>
                {loan.signature ? (
                  <div className="list__row">
                    <span>Signature</span>
                    <span className="mono">
                      {loan.signature.slice(0, 8)}…{loan.signature.slice(-6)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            {loan.status === "review" ? (
              <div className="notice" data-tone="locked">
                <strong>On review</strong>
                <p>
                  This borrow is reserved and waiting to be processed. It cannot be submitted again
                  for {loan.symbol}.
                </p>
              </div>
            ) : null}
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
