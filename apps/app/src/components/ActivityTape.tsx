"use client"

import { useEffect, useState } from "react"
import type { TapeEvent } from "@/lib/liveActivity"
import styles from "./ActivityTape.module.css"

const EXPLORER = "https://solscan.io"

const kindLabel: Record<TapeEvent["kind"], string> = {
  borrow: "BORROW",
  repay: "REPAY",
  "swap-out": "BORROW",
  "swap-in": "REPAY",
}

function shorten(value: string, lead = 4, tail = 4) {
  return `${value.slice(0, lead)}...${value.slice(-tail)}`
}

function timeAgo(occurredAt: number, now: number) {
  const delta = Math.max(1, Math.floor((now - occurredAt) / 1000))
  if (delta < 60) return `${delta}s`
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  return `${Math.floor(delta / 3600)}h`
}

function nextDelay() {
  return 60_000 + Math.floor(Math.random() * 180_001)
}

async function loadPool(): Promise<TapeEvent[]> {
  const response = await fetch("/api/activity-tape", { cache: "no-store" })
  if (!response.ok) return []
  const body = (await response.json()) as { events?: TapeEvent[] }
  return Array.isArray(body.events) ? body.events : []
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      className={styles.copy}
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
    >
      {copied ? "Copied" : label}
    </button>
  )
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
      if (pool.length === 0) pool = await loadPool()
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

  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null)
    }
    window.addEventListener("keydown", onKey)
    document.body.classList.add("modal-open")
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.classList.remove("modal-open")
    }
  }, [selected])

  return (
    <>
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
                    aria-label={`${kindLabel[event.kind]} ${event.amount} · ${shorten(event.wallet)} · open transaction`}
                    onClick={() => setSelected(event)}
                  >
                    <b>{kindLabel[event.kind]}</b>
                    <code>{shorten(event.wallet)}</code>
                    <span>{event.route}</span>
                    <strong>{event.amount}</strong>
                    <em>{now ? timeAgo(event.occurredAt, now) : "now"}</em>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <div className={styles.backdrop} onMouseDown={() => setSelected(null)}>
          <section
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tape-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>PROTOCOL EVENT</span>
                <h2 id="tape-title">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                Close
              </button>
            </header>
            <p>{selected.description}</p>
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
                  <span className="mono">{shorten(selected.wallet, 8, 8)}</span>
                  <CopyField value={selected.wallet} label="Copy" />
                </dd>
              </div>
              <div>
                <dt>Signature</dt>
                <dd>
                  <span className="mono">{shorten(selected.signature, 10, 8)}</span>
                  <CopyField value={selected.signature} label="Copy" />
                </dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <a
                className="button button--primary"
                href={`${EXPLORER}/tx/${encodeURIComponent(selected.signature)}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Solscan
              </a>
              <a
                className="button button--ghost"
                href={`${EXPLORER}/account/${encodeURIComponent(selected.wallet)}`}
                target="_blank"
                rel="noreferrer"
              >
                Wallet on Solscan
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
