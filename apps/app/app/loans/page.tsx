"use client"

import { UtilityGate } from "@/components/UtilityGate"

export default function LoansPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Loans</h1>
          <p>Active and closed LIEND loans for your wallet</p>
        </div>
      </header>
      <UtilityGate>
        <div className="empty">
          Loan records come from the LIEND lending program, which is not deployed. No loans can be
          listed for this deployment.
        </div>
      </UtilityGate>
    </>
  )
}
