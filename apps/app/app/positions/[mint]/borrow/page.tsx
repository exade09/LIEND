"use client"

import Link from "next/link"
import { use } from "react"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"

/** Borrow parameters. Quote values come from the server; none are computed here. */
export default function BorrowPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Borrow</h1>
          <p className="mono">{valid ?? "Invalid mint"}</p>
        </div>
      </header>
      <UtilityGate>
        <div className="stack">
          <div className="notice">
            <strong>Borrowing is not available yet</strong>
            <p>
              Borrow quotes require the LIEND lending program and a price source. Neither is
              connected for this deployment, so no quote can be produced.
            </p>
          </div>
          {valid && (
            <div className="row">
              <Link className="button button--ghost" href={`/positions/${valid}`}>
                Back to position
              </Link>
              <span className="button button--primary" aria-disabled="true">
                Review borrow
              </span>
            </div>
          )}
        </div>
      </UtilityGate>
    </>
  )
}
