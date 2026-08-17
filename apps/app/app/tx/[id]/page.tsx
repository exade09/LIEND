"use client"

import { use } from "react"

/**
 * Transaction status.
 *
 * The full state machine (preparing → awaiting signature → submitted →
 * pending → confirmed/failed/expired) is modelled in @liend/domain. Without a
 * real execution adapter there is nothing to track, and this screen must not
 * simulate progress.
 */
export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Transaction</h1>
          <p className="mono">{id}</p>
        </div>
      </header>
      <div className="empty">
        No transaction execution adapter is configured for this deployment, so no transaction
        status can be reported.
      </div>
    </>
  )
}
