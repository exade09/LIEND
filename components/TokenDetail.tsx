"use client"

import Image from "next/image"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { project } from "@/config/project"
import { shortenAddress } from "@/lib/addresses"
import { formatCompactCurrency, formatCurrency } from "@/lib/formatting"
import type { Market } from "@/types"

type TokenDetailProps = {
  market: Market
  onBorrow: () => void
  onSwap: () => void
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 38 - ((value - min) / range) * 30
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg className="sparkline" viewBox="0 0 100 42" preserveAspectRatio="none" role="img" aria-label="Demonstration market activity chart">
      <defs>
        <linearGradient id={`spark-${values.join("")}`} x1="0" x2="1">
          <stop offset="0" stopColor="#7b5cff" />
          <stop offset="1" stopColor="#23d8e8" />
        </linearGradient>
      </defs>
      <path className="sparkline__baseline" d="M0 38H100" />
      <polyline points={points} fill="none" stroke={`url(#spark-${values.join("")})`} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function TokenDetail({ market, onBorrow, onSwap }: TokenDetailProps) {
  const explorerHref = `${project.explorerUrl}/token/${market.mintAddress}`

  return (
    <article className="token-detail">
      <header className="token-detail__header">
        <div className="token-detail__identity">
          {market.ticker === "LIEND" ? (
            <Image className="token-avatar token-avatar--image" src="/assets/liend-avatar.png" alt="LIEND" width={50} height={50} />
          ) : (
            <span className="token-avatar token-avatar--large" style={{ "--token-accent": market.accent } as React.CSSProperties}>
              {market.iconLabel}
            </span>
          )}
          <div>
            <span className="overline">SELECTED MARKET</span>
            <h3>{market.name} <small>{market.ticker}</small></h3>
          </div>
        </div>
        <div className="token-detail__status">
          <span className="demo-badge">NOT LIVE</span>
          <span className="status-tag status-tag--eligible"><i /> {market.migrationStatus}</span>
        </div>
      </header>

      <div className="contract-line">
        <span>CONTRACT</span>
        <code>{shortenAddress(market.mintAddress, 8, 8)}</code>
        <CopyButton value={market.mintAddress} />
      </div>

      <div className="token-detail__chart">
        <div>
          <span className="data-label">MARKET ACTIVITY</span>
          <strong>{formatCurrency(market.priceUsd)}</strong>
          <small>Illustrative series</small>
        </div>
        <Sparkline values={market.sparkline} />
      </div>

      <dl className="token-metrics">
        <div><dt>Market Cap</dt><dd>{formatCompactCurrency(market.marketCapUsd)}</dd></div>
        <div><dt>Liquidity</dt><dd>{formatCompactCurrency(market.liquidityUsd)}</dd></div>
        <div><dt>24H Volume</dt><dd>{formatCompactCurrency(market.volume24hUsd)}</dd></div>
        <div><dt>Holder Position</dt><dd className="muted">Connect wallet</dd></div>
        <div><dt>Estimated Borrowable</dt><dd>{market.estimatedBorrowableUsd ? formatCompactCurrency(market.estimatedBorrowableUsd) : "No route"}</dd></div>
      </dl>

      <div className="token-detail__actions">
        <button className="button button--primary" type="button" onClick={onBorrow} disabled={!market.eligible}>
          <Icon name="borrow" size={17} /> Borrow
        </button>
        <button className="button button--ghost" type="button" onClick={onSwap}>
          <Icon name="swap" size={17} /> Swap
        </button>
        <a className="button button--text" href={explorerHref} target="_blank" rel="noreferrer">
          <Icon name="explorer" size={17} /> View Onchain
          <Icon name="external-link" size={13} />
        </a>
      </div>
      {!market.eligible ? <p className="inline-notice">No borrow route available for this demonstration market</p> : null}
    </article>
  )
}
