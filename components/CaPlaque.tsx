"use client"

import { getExplorerAddressUrl, isLikelySolanaAddress, shortenAddress } from "@/lib/addresses"
import { usePublishedCa } from "@/lib/usePublishedCa"

import styles from "./CaPlaque.module.css"

type CaPlaqueProps = {
  variant: "header" | "footer" | "menu"
  initialMint?: string | null
  live?: boolean
}

export function CaPlaque({ variant, initialMint = null, live = true }: CaPlaqueProps) {
  const published = usePublishedCa(initialMint)
  const mint = live ? published.mint : initialMint
  const isAddress = mint ? isLikelySolanaAddress(mint) : false
  const display = mint
    ? variant === "header" && isAddress
      ? shortenAddress(mint, 4, 4)
      : mint
    : "waiting"
  const explorer = mint && isAddress ? getExplorerAddressUrl(mint) : null

  return (
    <article
      className={`${styles.plaque} ${styles[variant]}`}
      data-state={mint ? "live" : "waiting"}
      aria-label="LIEND contract address"
      title={mint ?? undefined}
    >
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
    </article>
  )
}
