"use client"

import Link from "next/link"
import { use } from "react"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"

/**
 * Position detail — the future Extension deep-link target.
 *
 * The mint arrives from an untrusted source (a URL a content script built),
 * so it is validated here before anything renders. Financial values are never
 * read from the link; they will come from the API once adapters exist.
 */
export default function PositionDetailPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)

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
          <h1>Position</h1>
          <p className="mono">{valid}</p>
        </div>
      </header>
      <UtilityGate>
        <div className="stack">
          <div className="empty">
            Token identity, balance and borrowing capacity require production data sources that are
            not connected for this deployment yet.
          </div>
          <div className="row">
            <Link className="button button--primary" href={`/positions/${valid}/borrow`}>
              Continue to borrow
            </Link>
          </div>
        </div>
      </UtilityGate>
    </>
  )
}
