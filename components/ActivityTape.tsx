"use client"

import { useEffect, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { Modal } from "@/components/Modal"
import { type TapeEvent, type TapeKind } from "@/data/activityTape"
import { getExplorerAddressUrl, getExplorerTransactionUrl, shortenAddress } from "@/lib/addresses"
import styles from "./ActivityTape.module.css"

function kindIcon(kind: TapeKind) {
  if (kind === "borrow" || kind === "swap-out") return "borrow" as const
  return "transaction" as const
}

function liveKindLabel(kind: TapeKind) {
  return kind === "borrow" || kind === "swap-out" ? "BORROW" : "REPAY"
}

function timeAgo(occurredAt: number, now: number) {
  const delta = Math.max(1, Math.floor((now - occurredAt) / 1000))
  if (delta < 60) return `${delta}s`
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  return `${Math.floor(delta / 3600)}h`
}

function nextDelay() {
  return 5_000 + Math.floor(Math.random() * 20_000)
}

async function loadPool(): Promise<TapeEvent[]> {
  const response = await fetch("/api/activity-tape", { cache: "no-store" })
  if (!response.ok) return []
  const body = (await response.json()) as { events?: TapeEvent[] }
  return Array.isArray(body.events) ? body.events : []
}

export function ActivityTape() {
  const [events, setEvents] = useState<TapeEvent[]>([])
  const [selected, setSelected] = useState<TapeEvent | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)
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
    let pool: TapeEvent[] = []
    const seen = new Set<string>()

    const reveal = (event: TapeEvent) => {
      seen.add(event.signature)
      setFreshId(event.signature)
      setEvents((current) => [event, ...current.filter((item) => item.signature !== event.signature)].slice(0, 8))
    }

    const tick = async () => {
      if (cancelled) return
      if (pool.length === 0) {
        pool = await loadPool()
      }
      const unused = pool.filter((item) => !seen.has(item.signature))
      const source = unused.length > 0 ? unused : pool
      if (source.length > 0) {
        const next = source[Math.floor(Math.random() * source.length)]
        if (next) reveal(next)
      } else {
        pool = await loadPool()
      }
      if (unused.length <= 2) {
        void loadPool().then((fresh) => {
          if (!cancelled && fresh.length > 0) pool = fresh
        })
      }
      if (!cancelled) timer = window.setTimeout(() => void tick(), nextDelay())
    }

    void (async () => {
      pool = await loadPool()
      if (cancelled) return
      timer = window.setTimeout(() => void tick(), nextDelay())
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className={styles.tape}>
      <span className={styles.live} aria-hidden="true">
        <i />
        LIVE
      </span>
      <div className={styles.viewport}>
        <div className={styles.track}>
          <div className={styles.group}>
            {events.length === 0 ? (
              <span className={styles.idle}>listening for routes</span>
            ) : (
              events.map((event) => (
                <button
                  className={`${styles.item} ${freshId === event.signature ? styles.fresh : ""}`}
                  type="button"
                  key={event.signature}
                  aria-label={`${liveKindLabel(event.kind)} ${event.amount} · ${shortenAddress(event.wallet, 4, 4)} · open transaction`}
                  onClick={() => setSelected(event)}
                >
                  <Icon name={kindIcon(event.kind)} size={13} />
                  <b>{liveKindLabel(event.kind)}</b>
                  <code>{shortenAddress(event.wallet, 4, 4)}</code>
                  <span>{event.route}</span>
                  <strong>{event.amount}</strong>
                  <em>{now ? timeAgo(event.occurredAt, now) : "now"}</em>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        eyebrow="PROTOCOL EVENT"
        title={selected?.title ?? "Route"}
        size="wide"
      >
        {selected ? (
          <div className={styles.detail}>
            <p className={styles.lede}>{selected.description}</p>
            <div className={styles.changes}>
              <div>
                <span>Token</span>
                <strong>{selected.tokenDelta}</strong>
              </div>
              <div>
                <span>SOL</span>
                <strong>{selected.solDelta}</strong>
              </div>
              <div>
                <span>Route</span>
                <strong>{selected.route}</strong>
              </div>
            </div>
            <dl>
              <div>
                <dt>Wallet</dt>
                <dd>
                  <code>{shortenAddress(selected.wallet, 8, 8)}</code>
                  <CopyButton value={selected.wallet} label="Copy wallet" />
                </dd>
              </div>
              <div>
                <dt>Signature</dt>
                <dd>
                  <code>{shortenAddress(selected.signature, 10, 8)}</code>
                  <CopyButton value={selected.signature} label="Copy signature" />
                </dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <a
                className="button button--primary"
                href={getExplorerTransactionUrl(selected.signature)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="explorer" size={16} />
                Open Solscan
                <Icon name="external-link" size={13} />
              </a>
              <a
                className="button button--ghost"
                href={getExplorerAddressUrl(selected.wallet)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="wallet" size={16} />
                Wallet on Solscan
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
