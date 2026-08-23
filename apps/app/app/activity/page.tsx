"use client"

import { UtilityGate } from "@/components/UtilityGate"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { activityLabel } from "@/lib/unbacked-book"

export default function ActivityPage() {
  const { book } = useUnbackedBook()

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p>Borrows, repayments and liquidations for your wallet</p>
        </div>
      </header>
      <UtilityGate>
        {book.activity.length === 0 ? (
          <div className="empty">No activity yet</div>
        ) : (
          <div className="panel">
            <div className="list">
              {book.activity.map((item) => (
                <div className="list__row" key={item.id}>
                  <div>
                    <strong>{activityLabel(item.kind)}</strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      {item.symbol} · {new Date(item.occurredAt).toLocaleString()}
                    </p>
                  </div>
                  <span>{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </UtilityGate>
    </>
  )
}
