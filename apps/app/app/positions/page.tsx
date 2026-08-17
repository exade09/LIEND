"use client"

import { UtilityGate } from "@/components/UtilityGate"

/**
 * Positions explorer.
 *
 * The list is gated and, even when unlocked, has no production data adapter
 * yet — so it renders an explicit unavailable state rather than fixtures.
 */
export default function PositionsPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Positions</h1>
          <p>Migrated token positions held by your connected wallet</p>
        </div>
      </header>
      <UtilityGate>
        <div className="empty">
          Position data requires a connected Solana data source. No production adapter is
          configured for this deployment yet.
        </div>
      </UtilityGate>
    </>
  )
}
