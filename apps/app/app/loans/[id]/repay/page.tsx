"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { findLoan, sol } from "@/lib/unbacked-book"

export default function RepayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { book, confirmRepay } = useUnbackedBook()
  const loan = findLoan(book, id)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Repay loan</h1>
          <p className="mono">{id}</p>
        </div>
      </header>
      <UtilityGate>
        {loan && loan.status === "active" ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <div className="panel">
              <h2>Repayment</h2>
              <div className="list">
                <div className="list__row">
                  <span>Due</span>
                  <span>{sol(loan.outstandingSol)}</span>
                </div>
                <div className="list__row">
                  <span>Collateral released</span>
                  <span>
                    {loan.collateralAmount} {loan.symbol}
                  </span>
                </div>
              </div>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => {
                confirmRepay(id)
                router.push(`/loans/${id}`)
              }}
            >
              Confirm repayment
            </button>
          </div>
        ) : (
          <div className="empty">This loan cannot be repaid</div>
        )}
      </UtilityGate>
    </>
  )
}
