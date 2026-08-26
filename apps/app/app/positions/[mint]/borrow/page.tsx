"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { findPosition, loanLabel, maxBorrowSol, quoteBorrow, reservedLoan, sol, usd } from "@/lib/unbacked-book"

export default function BorrowPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)
  const router = useRouter()
  const { book, setQuote } = useUnbackedBook()
  const position = valid ? findPosition(book, valid) : null
  const reserved = valid ? reservedLoan(book, valid) : null
  const ceiling = position ? maxBorrowSol(position, book.solUsd) : 0
  const [amount, setAmount] = useState("0")
  const quote = position ? quoteBorrow(position, Number(amount) || 0, book.solUsd) : null

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAmount(ceiling > 0 ? (ceiling * 0.4).toFixed(3) : "0")
    })
    return () => window.cancelAnimationFrame(frame)
  }, [ceiling, valid])

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Borrow</h1>
          <p>{position ? `${position.symbol} → SOL` : valid ?? "Invalid mint"}</p>
        </div>
      </header>
      <UtilityGate>
        {reserved ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <div className="notice" data-tone="locked">
              <strong>{loanLabel(reserved.status)}</strong>
              <p>This token already has a borrow on review. A second request cannot be submitted.</p>
            </div>
            <Link className="button button--primary" href={`/loans/${reserved.id}`}>
              View request
            </Link>
          </div>
        ) : position && quote ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <label className="field">
              <span>Borrow amount</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <span className="muted">Max {sol(ceiling)}</span>
            </label>
            <div className="panel">
              <h2>Quote</h2>
              <div className="list">
                <div className="list__row">
                  <span>Collateral</span>
                  <span>
                    {quote.collateralAmount} {quote.symbol}
                  </span>
                </div>
                <div className="list__row">
                  <span>You receive</span>
                  <span>{sol(quote.borrowSol)}</span>
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
                <div className="list__row">
                  <span>Collateral value</span>
                  <span>{usd(quote.collateralUsd)}</span>
                </div>
              </div>
            </div>
            <div className="row">
              <Link className="button button--ghost" href={`/positions/${valid}`}>
                Back to position
              </Link>
              <button
                className="button button--primary"
                type="button"
                disabled={quote.borrowSol <= 0}
                onClick={() => {
                  setQuote(quote)
                  router.push(`/positions/${valid}/borrow/review`)
                }}
              >
                Review borrow
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">This position is not available to borrow against</div>
        )}
      </UtilityGate>
    </>
  )
}
