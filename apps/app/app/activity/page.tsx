"use client"

import { UtilityGate } from "@/components/UtilityGate"

export default function ActivityPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p>Borrows, repayments and liquidations for your wallet</p>
        </div>
      </header>
      <UtilityGate>
        <div className="empty">
          Activity history requires an indexer over the LIEND program. None is configured for this
          deployment.
        </div>
      </UtilityGate>
    </>
  )
}
