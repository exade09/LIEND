"use client"

import { useEffect, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon, type IconName } from "@/components/Icon"
import { isLikelySolanaAddress, shortenAddress } from "@/lib/addresses"
import { formatTimestamp } from "@/lib/formatting"
import { getProtocolActivity } from "@/services/solana"
import type { DataEnvelope, ProtocolAction, ProtocolActivity } from "@/types"

const actionIcons: Record<ProtocolAction, IconName> = {
  "Borrow opened": "borrow",
  "SOL received": "sol",
  "Position repaid": "transaction",
  "Collateral unlocked": "collateral",
  "Market added": "token",
  "Swap routed": "swap",
}

export function ActivityFeed() {
  const [activity, setActivity] = useState<DataEnvelope<ProtocolActivity[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    void getProtocolActivity()
      .then((response) => {
        if (!cancelled) setActivity(response)
      })
      .catch(() => {
        if (!cancelled) {
          setActivity(null)
          setError("Protocol activity is unavailable")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestVersion])

  const retry = () => {
    setActivity(null)
    setError(null)
    setLoading(true)
    setRequestVersion((current) => current + 1)
  }

  return (
    <section
      className="activity-feed section-shell"
      id="activity"
      aria-labelledby="activity-feed-title"
    >
      <header className="activity-feed__intro section-header">
        <p className="eyebrow section-eyebrow">PROTOCOL ACTIVITY</p>
        <h2 className="section-title" id="activity-feed-title">Protocol event stream</h2>
        <p className="section-description">
          A compact event stream for borrow, settlement, collateral and route activity
        </p>
      </header>

      <div className="activity-feed__panel">
        <div className="activity-feed__toolbar">
          <div className="activity-feed__status">
            <span className="activity-feed__pulse" aria-hidden="true" />
            <span>EVENT STREAM</span>
          </div>
          <span className="activity-feed__network">SOLANA</span>
        </div>

        {activity && !loading ? (
          <div className="data-provenance activity-feed__provenance">
            <span className={activity.isDemo ? "demo-badge" : "live-badge"}>
              {activity.dataLabel.toUpperCase()}
            </span>
            <span>{activity.notice ?? "Protocol activity supplied by the configured data provider"}</span>
            <span className="data-provenance__count">
              {activity.data.length.toString().padStart(2, "0")} EVENTS
            </span>
          </div>
        ) : null}

        <div className="activity-feed__body" aria-live="polite" aria-busy={loading}>
          {loading ? (
            <ol className="activity-list activity-list--loading" aria-label="Loading protocol activity">
              {Array.from({ length: 5 }, (_, index) => (
                <li className="activity-item activity-item--skeleton" key={index} aria-hidden="true">
                  <span className="activity-item__icon skeleton-block" />
                  <span className="activity-item__time skeleton-block" />
                  <span className="activity-item__summary skeleton-block" />
                  <span className="activity-item__wallet skeleton-block" />
                  <span className="activity-item__value skeleton-block" />
                </li>
              ))}
            </ol>
          ) : error ? (
            <div className="empty-state activity-feed__empty" role="status">
              <Icon name="status" size={22} />
              <strong>Activity unavailable</strong>
              <span>{error}</span>
              <button type="button" className="text-button" onClick={retry}>Retry</button>
            </div>
          ) : activity && activity.data.length > 0 ? (
            <ol className="activity-list" aria-label="Protocol events">
              {activity.data.map((item) => {
                const copyableWallet = isLikelySolanaAddress(item.wallet)

                return (
                  <li className="activity-item" key={item.id}>
                    <span className="activity-item__icon" aria-hidden="true">
                      <Icon name={actionIcons[item.action]} size={17} />
                    </span>
                    <time className="activity-item__time" dateTime={item.timestamp}>
                      {formatTimestamp(item.timestamp)}
                    </time>
                    <div className="activity-item__summary">
                      <strong>{item.action}</strong>
                      <span>{item.asset}</span>
                    </div>
                    <div className="activity-item__wallet">
                      <span>{copyableWallet ? shortenAddress(item.wallet) : item.wallet}</span>
                      {copyableWallet ? (
                        <CopyButton
                          value={item.wallet}
                          label="Copy wallet"
                          className="activity-item__copy"
                        />
                      ) : null}
                    </div>
                    <strong className="activity-item__value">{item.value}</strong>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="empty-state activity-feed__empty" role="status">
              <Icon name="transaction" size={22} />
              <strong>No recent activity</strong>
              <span>Protocol events will appear here when records are available</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
