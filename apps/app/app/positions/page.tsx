"use client"

import Link from "next/link"
import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { usd } from "@/lib/unbacked-book"

export default function PositionsPage() {
  const { book } = useUnbackedBook()

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Positions</h1>
          <p>Migrated token positions held by your connected wallet</p>
        </div>
      </header>
      <UtilityGate>
        <div className="list">
          {book.positions.map((position) => (
            <Link className="list__row" href={`/positions/${position.mint}`} key={position.mint}>
              <div>
                <strong>{position.symbol}</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {position.amount} {position.symbol}
                </p>
              </div>
              <span>{usd(position.valueUsd)}</span>
            </Link>
          ))}
        </div>
      </UtilityGate>
    </>
  )
}
