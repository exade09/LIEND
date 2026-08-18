"use client"

import Link from "next/link"
import { use } from "react"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { findPosition, maxBorrowSol, sol, usd } from "@/lib/unbacked-book"

export default function PositionDetailPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)
  const { book, loadingPositions } = useUnbackedBook()
  const position = valid ? findPosition(book, valid) : null
  const ceiling = position ? maxBorrowSol(position, book.solUsd) : 0

  if (!valid) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1>Invalid token</h1>
            <p>That address is not a valid Solana mint</p>
          </div>
        </header>
        <div className="empty">
          <Link className="button button--ghost" href="/positions">
            Back to positions
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{position?.symbol ?? "Position"}</h1>
          <p className="mono">{valid}</p>
        </div>
      </header>
      <UtilityGate>
        {position ? (
          <div className="stack" style={{ maxWidth: 640 }}>
            <div className="panel">
              <h2>Position</h2>
              <div className="list">
                <div className="list__row">
                  <span>Token</span>
                  <span>{position.name}</span>
                </div>
                <div className="list__row">
                  <span>Balance</span>
                  <span>
                    {position.amount} {position.symbol}
                  </span>
                </div>
                <div className="list__row">
                  <span>Value</span>
                  <span>{usd(position.valueUsd)}</span>
                </div>
                <div className="list__row">
                  <span>Available to borrow</span>
                  <span>{sol(maxBorrowSol(position, book.solUsd))}</span>
                </div>
              </div>
            </div>
            <div className="row">
              <Link className="button button--ghost" href="/positions">
                Back to positions
              </Link>
              <Link
                className="button button--primary"
                href={`/positions/${valid}/borrow`}
                aria-disabled={ceiling <= 0}
              >
                Borrow SOL
              </Link>
            </div>
          </div>
        ) : loadingPositions ? (
          <div className="empty">Reading token accounts…</div>
        ) : (
          <div className="empty">This wallet has no position in that token</div>
        )}
      </UtilityGate>
    </>
  )
}
