"use client"

import Link from "next/link"
import { use } from "react"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { findPosition, loanLabel, maxBorrowEth, reservedLoan, eth, usd } from "@/lib/unbacked-book"

export default function PositionDetailPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)
  const { book, loadingPositions } = useUnbackedBook()
  const position = valid ? findPosition(book, valid) : null
  const reserved = valid ? reservedLoan(book, valid) : null
  const ceiling = position ? maxBorrowEth(position, book.ethUsd) : 0

  if (!valid) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1>Invalid token</h1>
            <p>That address is not a valid Robinhood Chain mint</p>
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
                  <span>{reserved ? loanLabel(reserved.status) : eth(maxBorrowEth(position, book.ethUsd))}</span>
                </div>
              </div>
            </div>
            {reserved ? (
              <div className="notice" data-tone="locked">
                <strong>{loanLabel(reserved.status)}</strong>
                <p>This token is reserved. Another borrow cannot be opened against it.</p>
              </div>
            ) : null}
            <div className="row">
              <Link className="button button--ghost" href="/positions">
                Back to positions
              </Link>
              {reserved ? (
                <Link className="button button--primary" href={`/loans/${reserved.id}`}>
                  View request
                </Link>
              ) : (
                <Link
                  className="button button--primary"
                  href={`/positions/${valid}/borrow`}
                  aria-disabled={ceiling <= 0}
                >
                  Borrow ETH
                </Link>
              )}
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
