"use client"

import { useEffect, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon, type IconName } from "@/components/Icon"
import { kindLabel, type TapeEvent, type TapeKind } from "@/data/activityTape"
import { getExplorerTransactionUrl, isLikelySolanaAddress, shortenAddress } from "@/lib/addresses"

function kindIcon(kind: TapeKind): IconName {
  if (kind === "borrow") return "borrow"
  if (kind === "repay") return "transaction"
  return "swap"
}

function timeAgo(occurredAt: number, now: number) {
  const delta = Math.max(1, Math.floor((now - occurredAt) / 1000))
  if (delta < 60) return `${delta}s`
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  if (delta < 86_400) return `${Math.floor(delta / 3600)}h`
  return `${Math.floor(delta / 86_400)}d`
}

async function loadEvents(): Promise<TapeEvent[]> {
  const response = await fetch("/api/activity-tape", { cache: "no-store" })
  if (!response.ok) return []
  const body = (await response.json()) as { events?: TapeEvent[] }
  return Array.isArray(body.events) ? body.events : []
}

export function ActivityFeed() {
  const [events, setEvents] = useState<TapeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()))
    const timer = window.setInterval(() => setNow(Date.now()), 4_000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer = 0

    const pull = async () => {
      try {
        const next = await loadEvents()
        if (cancelled) return
        setEvents(next.slice(0, 8))
        setError(null)
      } catch {
        if (!cancelled) {
          setEvents([])
          setError("Activity is unavailable")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const loop = async () => {
      await pull()
      if (cancelled) return
      timer = window.setTimeout(() => {
        void loop()
      }, 18_000)
    }

    void loop()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const live = !loading && !error && events.length > 0

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
          Public Solana routes on this desk. STAYFI program records replace this when the book is onchain
        </p>
      </header>

      <div className="activity-feed__panel">
        <div className="activity-feed__toolbar">
          <div className="activity-feed__status">
            <span className="activity-feed__pulse" aria-hidden="true" />
            <span>{live ? "LIVE ROUTES" : "EVENT STREAM"}</span>
          </div>
          <span className="activity-feed__network">{live ? "SOLANA • LIVE" : "SOLANA"}</span>
        </div>

        {live ? (
          <div className="data-provenance activity-feed__provenance">
            <span className="data-provenance__count">
              {events.length.toString().padStart(2, "0")} EVENTS
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
            </div>
          ) : events.length > 0 ? (
            <ol className="activity-list" aria-label="Protocol events">
              {events.map((item) => {
                const copyableWallet = isLikelySolanaAddress(item.wallet)
                const explorer = getExplorerTransactionUrl(item.signature)

                return (
                  <li className="activity-item" key={item.signature}>
                    <span className="activity-item__icon" aria-hidden="true">
                      <Icon name={kindIcon(item.kind)} size={17} />
                    </span>
                    <time className="activity-item__time" dateTime={new Date(item.occurredAt).toISOString()}>
                      {now ? timeAgo(item.occurredAt, now) : "…"}
                    </time>
                    <div className="activity-item__summary">
                      <strong>{item.title}</strong>
                      <span>{kindLabel[item.kind]} · {item.asset}</span>
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
                      {explorer ? (
                        <a href={explorer} target="_blank" rel="noreferrer">
                          Solscan
                        </a>
                      ) : null}
                    </div>
                    <strong className="activity-item__value">{item.amount}</strong>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="empty-state activity-feed__empty" role="status">
              <Icon name="transaction" size={22} />
              <strong>listening for routes</strong>
              <span>Nothing on the desk yet. The stream does not invent a tick</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
