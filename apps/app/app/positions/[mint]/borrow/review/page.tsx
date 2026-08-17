"use client"

import { use } from "react"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"

/**
 * Borrow review — the last screen before a wallet signature.
 *
 * Structured to show amount, collateral, fees, interest, LTV/health and quote
 * expiry when a real server-signed quote exists. Nothing is displayed until
 * then; an empty review screen is correct, invented terms would not be.
 */
export default function BorrowReviewPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Review borrow</h1>
          <p className="mono">{valid ?? "Invalid mint"}</p>
        </div>
      </header>
      <UtilityGate>
        <div className="notice">
          <strong>No quote to review</strong>
          <p>
            A review requires a server-signed quote from the LIEND lending program. Execution
            infrastructure is not available for this deployment.
          </p>
        </div>
      </UtilityGate>
    </>
  )
}
