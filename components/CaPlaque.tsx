"use client"

import { useEffect, useRef, useState } from "react"

import { getExplorerAddressUrl, shortenAddress } from "@/lib/addresses"
import { usePublishedCa } from "@/lib/usePublishedCa"

import styles from "./CaPlaque.module.css"

type CaPlaqueProps = {
  variant: "header" | "hero" | "footer" | "menu"
  initialMint?: string | null
  live?: boolean
}

export function CaPlaque({ variant, initialMint = null, live = true }: CaPlaqueProps) {
  const published = usePublishedCa(initialMint)
  const mint = live ? published.mint : initialMint
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compact = variant === "header" || variant === "menu"
  const display = mint
    ? compact
      ? shortenAddress(mint, 4, 4)
      : mint
    : compact
      ? "waiting"
      : "will appear here at launch"
  const explorer = mint ? getExplorerAddressUrl(mint) : null

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const copy = async () => {
    if (!mint) return
    try {
      await navigator.clipboard.writeText(mint)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1_600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article
      className={`${styles.plaque} ${styles[variant]}`}
      data-state={mint ? "live" : "waiting"}
      aria-label="LIEND contract address"
    >
      <header className={styles.bar}>
        <span className={styles.brand}>
          <i className={styles.signal} aria-hidden="true" />
          LIEND
        </span>
        <span className={styles.title}>{compact ? "CA.LIEND" : "CONTRACT_ADDRESS.EXE"}</span>
        <span className={styles.state}>{mint ? "LIVE" : "STANDBY"}</span>
        <span className={styles.controls} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </header>

      <div className={styles.well}>
        <span className={styles.kicker}>CA:</span>
        {explorer ? (
          <a
            className={styles.mint}
            href={explorer}
            target="_blank"
            rel="noreferrer"
            title={mint ?? undefined}
          >
            {display}
          </a>
        ) : (
          <span className={styles.waiting}>{display}</span>
        )}
        {mint ? (
          <button
            className={`${styles.copy} ${copied ? styles.copied : ""}`}
            type="button"
            onClick={copy}
            aria-label={copied ? "Contract address copied" : "Copy contract address"}
          >
            {copied ? "COPIED" : "COPY"}
          </button>
        ) : null}
      </div>

      {!compact ? (
        <div className={styles.meta}>
          <span>
            <i aria-hidden="true" />
            OFFICIAL ADDRESS CHANNEL
          </span>
          <span>SOLANA / MAINNET</span>
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {copied ? "Contract address copied to clipboard" : ""}
      </span>
    </article>
  )
}
