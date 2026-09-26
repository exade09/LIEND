"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon, type IconName } from "@/components/Icon"
import { kindLabel, type TapeEvent, type TapeKind } from "@/data/activityTape"
import {
  getExplorerAddressUrl,
  getExplorerTransactionUrl,
  isLikelySolanaAddress,
  shortenAddress,
} from "@/lib/addresses"

/**
 * The desk fills the way a tape does: one route on arrival, another every
 * twenty to fifty seconds after that.
 *
 * The API hands back a pool of real pump.fun swaps rather than a screen's
 * worth, and this reveals them one at a time. The delay is redrawn after every
 * reveal, so the rhythm is irregular the way real traffic is - a fixed cadence
 * reads as a carousel, which is exactly what this is not.
 */

const VISIBLE_LIMIT = 8
const MIN_DELAY_MS = 20_000
const MAX_DELAY_MS = 50_000
/** Refill before the pool runs dry, so a reveal never waits on a fetch. */
const REFILL_AT = 2

function nextDelay(): number {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1))
}

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
  const [open, setOpen] = useState<string | null>(null)

  /** Fetched but not yet shown. A ref, so refilling never re-renders the desk. */
  const pool = useRef<TapeEvent[]>([])
  /** Every signature shown this session, so a refill cannot repeat one. */
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()))
    const timer = window.setInterval(() => setNow(Date.now()), 4_000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(timer)
    }
  }, [])

  const refill = useCallback(async () => {
    const fetched = await loadEvents()
    const fresh = fetched.filter((event) => !seen.current.has(event.signature))
    pool.current = [...pool.current, ...fresh]
    return fresh.length
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer = 0

    /** Moves one route onto the desk, the oldest row falling off the bottom. */
    const reveal = () => {
      const next = pool.current.shift()
      if (!next) return false
      seen.current.add(next.signature)
      setEvents((current) => [next, ...current].slice(0, VISIBLE_LIMIT))
      return true
    }

    const tick = async () => {
      if (cancelled) return
      if (pool.current.length <= REFILL_AT) {
        try {
          await refill()
        } catch {
          // A failed refill is not an empty desk: what is shown stays shown.
        }
      }
      if (cancelled) return
      reveal()
      timer = window.setTimeout(() => void tick(), nextDelay())
    }

    const start = async () => {
      try {
        await refill()
        if (cancelled) return
        // One route is on the desk immediately; the rest arrive on the clock.
        if (!reveal()) setError("No routes in range right now")
      } catch {
        if (!cancelled) setError("Activity is unavailable")
      } finally {
        if (!cancelled) setLoading(false)
      }
      if (!cancelled) timer = window.setTimeout(() => void tick(), nextDelay())
    }

    void start()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [refill])

  const live = !loading && events.length > 0

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
          Public Solana routes on this desk. LONS program records replace this when the book is onchain
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
              {Array.from({ length: 3 }, (_, index) => (
                <li className="activity-item activity-item--skeleton" key={index} aria-hidden="true">
                  <span className="activity-item__row">
                    <span className="activity-item__icon skeleton-block" />
                    <span className="activity-item__time skeleton-block" />
                    <span className="activity-item__summary skeleton-block" />
                    <span className="activity-item__wallet skeleton-block" />
                    <span className="activity-item__value skeleton-block" />
                  </span>
                </li>
              ))}
            </ol>
          ) : events.length > 0 ? (
            <ol className="activity-list" aria-label="Protocol events">
              {events.map((item) => {
                const copyableWallet = isLikelySolanaAddress(item.wallet)
                const explorer = getExplorerTransactionUrl(item.signature)
                const mintUrl = isLikelySolanaAddress(item.mint)
                  ? getExplorerAddressUrl(item.mint)
                  : null
                const expanded = open === item.signature
                const detailId = `activity-detail-${item.signature}`

                return (
                  <li
                    className="activity-item"
                    data-open={expanded ? "true" : undefined}
                    key={item.signature}
                  >
                    <button
                      aria-controls={detailId}
                      aria-expanded={expanded}
                      className="activity-item__row"
                      onClick={() => setOpen(expanded ? null : item.signature)}
                      type="button"
                    >
                      <span className="activity-item__icon" aria-hidden="true">
                        <Icon name={kindIcon(item.kind)} size={17} />
                      </span>
                      <time
                        className="activity-item__time"
                        dateTime={new Date(item.occurredAt).toISOString()}
                      >
                        {now ? timeAgo(item.occurredAt, now) : "…"}
                      </time>
                      <span className="activity-item__summary">
                        <strong>{item.title}</strong>
                        <span>{kindLabel[item.kind]} · {item.asset}</span>
                      </span>
                      <span className="activity-item__wallet">
                        <span>{copyableWallet ? shortenAddress(item.wallet) : item.wallet}</span>
                      </span>
                      <strong className="activity-item__value">{item.amount}</strong>
                      <span className="activity-item__chevron" aria-hidden="true">
                        <Icon name="chevron" size={13} />
                      </span>
                    </button>

                    <div className="activity-item__detail" hidden={!expanded} id={detailId}>
                      <p className="activity-item__description">{item.description}</p>

                      <dl className="activity-item__facts">
                        <div>
                          <dt>Route</dt>
                          <dd>{item.route}</dd>
                        </div>
                        <div>
                          <dt>Token</dt>
                          <dd>{item.tokenDelta}</dd>
                        </div>
                        <div>
                          <dt>SOL</dt>
                          <dd>{item.nativeDelta}</dd>
                        </div>
                        <div>
                          <dt>Settled</dt>
                          <dd>{new Date(item.occurredAt).toUTCString()}</dd>
                        </div>
                        <div className="activity-item__fact--wide">
                          <dt>Wallet</dt>
                          <dd>
                            <span className="activity-item__address">{item.wallet}</span>
                            {copyableWallet ? (
                              <CopyButton
                                value={item.wallet}
                                label="Copy wallet"
                                className="activity-item__copy"
                              />
                            ) : null}
                          </dd>
                        </div>
                        <div className="activity-item__fact--wide">
                          <dt>Mint</dt>
                          <dd>
                            <span className="activity-item__address">{item.mint}</span>
                            <CopyButton
                              value={item.mint}
                              label="Copy mint"
                              className="activity-item__copy"
                            />
                          </dd>
                        </div>
                      </dl>

                      <div className="activity-item__links">
                        {explorer ? (
                          <a
                            className="button button--ghost button--small"
                            href={explorer}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View transaction on Solscan
                          </a>
                        ) : null}
                        {mintUrl ? (
                          <a
                            className="button button--ghost button--small"
                            href={mintUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View token on Solscan
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="empty-state activity-feed__empty" role="status">
              <Icon name="transaction" size={22} />
              <strong>listening for routes</strong>
              <span>{error ?? "Nothing on the desk yet. The stream does not invent a tick"}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
