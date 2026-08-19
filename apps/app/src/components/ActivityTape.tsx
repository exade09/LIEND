"use client"

import { useEffect, useState } from "react"
import styles from "./ActivityTape.module.css"

type TapeKind = "borrow" | "repay" | "swap-out" | "swap-in"

type TapeEvent = {
  id: string
  kind: TapeKind
  wallet: string
  signature: string
  asset: string
  title: string
  route: string
  amount: string
  description: string
  tokenDelta: string
  solDelta: string
  offsetMs: number
}

const EXPLORER = "https://solscan.io"

const kindLabel: Record<TapeKind, string> = {
  borrow: "BORROW",
  repay: "REPAY",
  "swap-out": "SWAP",
  "swap-in": "SWAP",
}

const tapeEvents: TapeEvent[] = [
  {
    id: "tape-01",
    kind: "borrow",
    wallet: "7YmaK5wR9cT2xN6vB3dH8qP4sE7jF2uG5zM9nC3kW8a",
    signature: "4xTq7mK2vR9cW5yN8sH3aP6dE2jF7uG4zB9nC5kM8wQ3rT6yV2pD7sX4aH9eJ5uF8cN3kR6wY2mQ7tPzB8n",
    asset: "LIEND",
    title: "Borrow opened",
    route: "LIEND → SOL",
    amount: "11.27 SOL",
    description: "Wallet posted LIEND as collateral and opened a borrow. Settlement paid out 11.27 SOL.",
    tokenDelta: "− 18,400 LIEND",
    solDelta: "+ 11.27 SOL",
    offsetMs: 18_000,
  },
  {
    id: "tape-02",
    kind: "swap-out",
    wallet: "3QvN8cR5wT2yK7sM4aH9xP6dE3jF8uG5zB2nW7kC4qV",
    signature: "8pR3wN6cT2yK7sV4aH9xD5mE8jF3uG6zB2qW7kC4nM9rT5yP2dS8vX3aJ6eQ4uF7cN2kR9wY5mH8bV3s",
    asset: "KITE",
    title: "Token swapped to SOL",
    route: "KITE → SOL",
    amount: "15.93 SOL",
    description: "Migrated KITE was routed through the liquidity desk and settled into SOL.",
    tokenDelta: "− 412,900 KITE",
    solDelta: "+ 15.93 SOL",
    offsetMs: 41_000,
  },
  {
    id: "tape-03",
    kind: "swap-in",
    wallet: "9mC4qV7wR2yK5sN8aH3xP6dE9jF4uG7zB2nW5kT8cM3",
    signature: "2yK7sV4aH9xD5mE8jF3uG6zB2qW7kC4nM9rT5pR3wN6cT8vX3aJ6eQ4uF7dS2cN9kR5wY8mH2pD6sEbA4",
    asset: "LIEND",
    title: "SOL swapped to token",
    route: "SOL → LIEND",
    amount: "240,800 LIEND",
    description: "SOL was swapped back into LIEND on the return route after the borrow window closed.",
    tokenDelta: "+ 240,800 LIEND",
    solDelta: "− 8.40 SOL",
    offsetMs: 73_000,
  },
  {
    id: "tape-04",
    kind: "repay",
    wallet: "5sV8aH3xP6dE9jF4uG7zB2nW5kT8cM3qR6yK2mN9vC4",
    signature: "6nM9rT5yP2dS8vX3aJ6eQ4uF7cN2kR9wY5mH8pR3wN6cT2yK7sV4aH9xD5mE8jF3uG6zB2qW7kC9dP4",
    asset: "LIEND",
    title: "Position repaid",
    route: "SOL → LIEND vault",
    amount: "4.80 SOL",
    description: "Outstanding borrow was repaid in SOL and the LIEND collateral lock was released.",
    tokenDelta: "+ 9,120 LIEND",
    solDelta: "− 4.80 SOL",
    offsetMs: 112_000,
  },
  {
    id: "tape-05",
    kind: "borrow",
    wallet: "8cM3qR6yK2mN9vC4sV7aH5xP8dE3jF6uG2zB4nW7kT5",
    signature: "9wY5mH8pR3wN6cT2yK7sV4aH9xD5mE8jF3uG6zB2qW7kC4nM9rT5yP2dS8vX3aJ6eQ4uF7cN2kZ8tR",
    asset: "FOLI",
    title: "Borrow opened",
    route: "FOLI → SOL",
    amount: "7.27 SOL",
    description: "FOLI collateral was posted against the market and 7.27 SOL was borrowed out.",
    tokenDelta: "− 61,250 FOLI",
    solDelta: "+ 7.27 SOL",
    offsetMs: 148_000,
  },
  {
    id: "tape-06",
    kind: "swap-out",
    wallet: "4nW7kT5sV8aH3xP6dE9jF2uG5zB8cM3qR6yK9mN4vC7",
    signature: "3aJ6eQ4uF7cN2kR9wY5mH8pR3wN6cT2yK7sV4aH9xD5mE8jF3uG6zB2qW7kC4nM9rT5yP2dS8vX1wQ",
    asset: "LIEND",
    title: "Token swapped to SOL",
    route: "LIEND → SOL",
    amount: "3.14 SOL",
    description: "A LIEND bag was swapped into SOL on the same desk used for borrow settlement.",
    tokenDelta: "− 52,600 LIEND",
    solDelta: "+ 3.14 SOL",
    offsetMs: 191_000,
  },
  {
    id: "tape-07",
    kind: "swap-in",
    wallet: "2qW7kC4nM9rT5yP8dS3vX6aJ9eQ1uF4cN7kR2wY5mH8",
    signature: "5mE8jF3uG6zB2qW7kC4nM9rT5yP2dS8vX3aJ6eQ4uF7cN2kR9wY5mH8pR3wN6cT2yK7sV4aH9xD6nB",
    asset: "KITE",
    title: "SOL swapped to token",
    route: "SOL → KITE",
    amount: "88,420 KITE",
    description: "SOL was rotated back into KITE after the wallet closed the previous borrow leg.",
    tokenDelta: "+ 88,420 KITE",
    solDelta: "− 2.61 SOL",
    offsetMs: 226_000,
  },
  {
    id: "tape-08",
    kind: "borrow",
    wallet: "6zB2qW7kC4nM9rT5yP2dS8vX3aJ6eQ4uF7cN2kR9wY5",
    signature: "7sV4aH9xD5mE8jF3uG6zB2qW7kC4nM9rT5yP2dS8vX3aJ6eQ4uF7cN2kR9wY5mH8pR3wN6cT2yK4fM",
    asset: "ARC",
    title: "Borrow opened",
    route: "ARC → SOL",
    amount: "9.02 SOL",
    description: "ARC was locked as collateral and the wallet borrowed 9.02 SOL against the position.",
    tokenDelta: "− 27,800 ARC",
    solDelta: "+ 9.02 SOL",
    offsetMs: 263_000,
  },
]

function shorten(value: string, lead = 4, tail = 4) {
  return `${value.slice(0, lead)}...${value.slice(-tail)}`
}

function timeAgo(offsetMs: number, now: number) {
  const delta = Math.max(4, Math.floor((now % 900_000 + offsetMs) / 1000) % 480)
  if (delta < 60) return `${delta}s`
  return `${Math.floor(delta / 60)}m`
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
  const [selected, setSelected] = useState<TapeEvent | null>(null)
  const [now, setNow] = useState(0)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 4000)
    return () => window.clearInterval(timer)
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
      <div className={styles.tape} data-paused={selected || held ? "true" : undefined}>
        <span className={styles.live} aria-hidden="true">
          <i />
          LIVE
        </span>
        <div
          className={styles.viewport}
          onPointerDown={() => setHeld(true)}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
        >
          <div className={styles.track}>
            {[0, 1].map((copy) => (
              <div className={styles.group} key={copy} aria-hidden={copy === 1}>
                {tapeEvents.map((event) => (
                  <button
                    className={styles.item}
                    type="button"
                    key={`${copy}-${event.id}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    aria-label={`${kindLabel[event.kind]} ${event.amount} · ${shorten(event.wallet)} · open transaction`}
                    onClick={() => setSelected(event)}
                  >
                    <b>{kindLabel[event.kind]}</b>
                    <code>{shorten(event.wallet)}</code>
                    <span>{event.route}</span>
                    <strong>{event.amount}</strong>
                    <em>{now ? timeAgo(event.offsetMs, now) : "now"}</em>
                  </button>
                ))}
              </div>
            ))}
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
