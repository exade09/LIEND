"use client"

import { useEffect, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { Modal } from "@/components/Modal"
import { kindLabel, tapeEvents, type TapeEvent, type TapeKind } from "@/data/activityTape"
import { getExplorerAddressUrl, getExplorerTransactionUrl, shortenAddress } from "@/lib/addresses"
import styles from "./ActivityTape.module.css"

function kindIcon(kind: TapeKind) {
  if (kind === "borrow") return "borrow" as const
  if (kind === "repay") return "transaction" as const
  return "swap" as const
}

function timeAgo(offsetMs: number, now: number) {
  const delta = Math.max(4, Math.floor((now % 900_000 + offsetMs) / 1000) % 480)
  if (delta < 60) return `${delta}s`
  return `${Math.floor(delta / 60)}m`
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

  return (
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
                    aria-label={`${kindLabel[event.kind]} ${event.amount} · ${shortenAddress(event.wallet, 4, 4)} · open transaction`}
                    onClick={() => setSelected(event)}
                  >
                  <Icon name={kindIcon(event.kind)} size={13} />
                  <b>{kindLabel[event.kind]}</b>
                  <code>{shortenAddress(event.wallet, 4, 4)}</code>
                  <span>{event.route}</span>
                  <strong>{event.amount}</strong>
                  <em>{now ? timeAgo(event.offsetMs, now) : "now"}</em>
                </button>
              ))}
            </div>
          ))}
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
