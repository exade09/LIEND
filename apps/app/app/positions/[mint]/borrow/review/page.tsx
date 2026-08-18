"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { sol, usd } from "@/lib/unbacked-book"

export default function BorrowReviewPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)
  const router = useRouter()
  const { readQuote, confirmBorrow } = useUnbackedBook()
  const [busy, setBusy] = useState(false)
  const quote = useMemo(() => {
    const pending = readQuote()
    return pending && pending.mint === valid ? pending : null
  }, [readQuote, valid])

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Review borrow</h1>
          <p className="mono">{valid ?? "Invalid mint"}</p>
        </div>
      </header>
      <UtilityGate>
        {quote ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <div className="panel">
              <h2>Terms</h2>
              <div className="list">
                <div className="list__row">
                  <span>Borrow</span>
                  <span>{sol(quote.borrowSol)}</span>
                </div>
                <div className="list__row">
                  <span>Collateral</span>
                  <span>
                    {quote.collateralAmount} {quote.symbol}
                  </span>
                </div>
                <div className="list__row">
                  <span>Collateral value</span>
                  <span>{usd(quote.collateralUsd)}</span>
                </div>
                <div className="list__row">
                  <span>Fee</span>
                  <span>{sol(quote.feeSol)}</span>
                </div>
                <div className="list__row">
                  <span>LTV</span>
                  <span>{(quote.ltvBps / 100).toFixed(1)}%</span>
                </div>
                <div className="list__row">
                  <span>Interest</span>
                  <span>{(quote.interestRateBps / 100).toFixed(1)}% APR</span>
                </div>
              </div>
            </div>
            <button
              className="button button--primary"
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                const id = confirmBorrow(quote)
                if (id) router.push(`/loans/${id}`)
                else setBusy(false)
              }}
            >
              Confirm borrow
            </button>
          </div>
        ) : (
          <div className="empty">No quote to review. Start from a position.</div>
        )}
      </UtilityGate>
    </>
  )
}
