"use client"

import Link from "next/link"
import { use } from "react"
import { UtilityGate } from "@/components/UtilityGate"

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Loan</h1>
          <p className="mono">{id}</p>
        </div>
      </header>
      <UtilityGate>
        <div className="stack">
          <div className="empty">
            Loan terms, health and accrued interest require the LIEND lending program.
          </div>
          <div className="row">
            <Link className="button button--ghost" href={`/loans/${id}/repay`}>
              Repay
            </Link>
          </div>
        </div>
      </UtilityGate>
    </>
  )
}
