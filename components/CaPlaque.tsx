"use client"

import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/Icon"
import { copyText } from "@/lib/clipboard"
import { getExplorerAddressUrl, isLikelySolanaAddress } from "@/lib/addresses"
import { usePublishedCa } from "@/lib/usePublishedCa"

import styles from "./CaPlaque.module.css"

type CaPlaqueProps = {
  variant: "header" | "footer" | "menu"
  initialMint?: string | null
  live?: boolean
}

/**
 * The published contract address.
 *
 * The address itself copies on click, because that is what anyone reading a CA
 * is there to do. It used to be a link to the explorer, which meant the one
 * action people actually wanted took a hand-made selection across forty-four
 * characters of monospace. The explorer keeps its own affordance beside it
 * rather than losing the route.
 */
export function CaPlaque({ variant, initialMint = null, live = true }: CaPlaqueProps) {
  const published = usePublishedCa(initialMint)
  const mint = live ? published.mint : initialMint
  const isAddress = mint ? isLikelySolanaAddress(mint) : false
  const display = mint ?? "waiting"
  const explorer = mint && isAddress ? getExplorerAddressUrl(mint) : null

  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current)
  }, [])

  const copy = async () => {
    if (!mint) return
    // Only claim a copy that actually happened: the confirmation is the only
    // signal there is, so a false one sends someone off with an empty paste.
    if (!(await copyText(mint))) return
    setCopied(true)
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <article
      className={`${styles.plaque} ${styles[variant]}`}
      data-state={mint ? "live" : "waiting"}
      data-copied={copied ? "true" : undefined}
      aria-label="LONS contract address"
      title={mint ?? undefined}
    >
      <span className={styles.kicker}>CA:</span>
      {isAddress ? (
        <>
          <button
            className={styles.mint}
            onClick={copy}
            title={copied ? "Copied" : "Copy contract address"}
            type="button"
          >
            {display}
          </button>
          <span className={styles.actions}>
            <button
              aria-label={copied ? "Contract address copied" : `Copy contract address ${mint}`}
              className={styles.action}
              onClick={copy}
              title={copied ? "Copied" : "Copy contract address"}
              type="button"
            >
              <Icon name={copied ? "check" : "copy"} size={12} />
            </button>
            {explorer ? (
              <a
                aria-label="Open the contract on Solscan"
                className={`${styles.action} ${styles.explorerAction}`}
                href={explorer}
                rel="noreferrer"
                target="_blank"
                title="Open on Solscan"
              >
                <Icon name="external-link" size={12} />
              </a>
            ) : null}
          </span>
          {/* Announced on copy, without moving anything on screen. */}
          <span className={styles.srOnly} role="status">{copied ? "Contract address copied" : ""}</span>
        </>
      ) : (
        <span className={styles.waiting}>{display}</span>
      )}
    </article>
  )
}
