"use client"

import { use } from "react"
import { UtilityGate } from "@/components/UtilityGate"

export default function RepayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Repay loan</h1>
          <p className="mono">{id}</p>
        </div>
      </header>
      <UtilityGate>
        <div className="notice">
          <strong>Repayment is not available yet</strong>
          <p>
            Repayment builds a transaction against the LIEND lending program, which is not
            deployed for this environment.
          </p>
        </div>
      </UtilityGate>
    </>
  )
}
