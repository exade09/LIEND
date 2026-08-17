"use client"

import { useEffect, useMemo, useState } from "react"
import { Icon } from "@/components/Icon"
import { Modal } from "@/components/Modal"
import { formatNumber, formatPercent, formatSol } from "@/lib/formatting"
import { getSwapQuote } from "@/services/swaps"
import type { Market, SwapQuote } from "@/types"

type SwapPanelProps = {
  markets: Market[]
  initialMarket: Market
}

export function SwapPanel({ markets, initialMarket }: SwapPanelProps) {
  const [selectedId, setSelectedId] = useState(initialMarket.id)
  const [amount, setAmount] = useState(10000)
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [routeId, setRouteId] = useState("")
  const [loading, setLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState("")

  const market = markets.find((item) => item.id === selectedId) ?? initialMarket
  const matchingMarkets = useMemo(() => {
    const search = query.trim().toLowerCase()
    return markets.filter((item) => !search || item.name.toLowerCase().includes(search) || item.ticker.toLowerCase().includes(search) || item.mintAddress.toLowerCase().includes(search))
  }, [markets, query])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      if (amount <= 0) {
        if (active) {
          setQuote(null)
          setLoading(false)
        }
        return
      }
      if (active) setLoading(true)
      try {
        const next = await getSwapQuote({
          inputMint: market.mintAddress,
          outputMint: "SOL",
          inputSymbol: market.ticker,
          outputSymbol: "SOL",
          amount,
          slippageBps: 50,
        })
        if (!active) return
        setQuote(next)
        setRouteId(next.routes[0]?.id ?? "")
      } finally {
        if (active) setLoading(false)
      }
    }, 240)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [amount, market.mintAddress, market.ticker])

  const activeRoute = quote?.routes.find((route) => route.id === routeId) ?? quote?.routes[0]

  return (
    <div className="swap-panel">
      <div className="panel-heading">
        <div>
          <span className="overline">LIEND-NATIVE ROUTING</span>
          <h3>Swap route</h3>
        </div>
        <div className="panel-heading__meta"><span className="demo-badge">NOT CONNECTED</span><span className="network-chip">Solana</span></div>
      </div>

      <div className="swap-shell">
        <section className="swap-field">
          <header><span>You Pay</span><small>Balance <b>Not connected</b></small></header>
          <div className="swap-field__input">
            <input type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} aria-label={`Amount of ${market.ticker} to pay`} />
            <button className="token-select" type="button" onClick={() => setPickerOpen((value) => !value)} aria-expanded={pickerOpen}>
              <span className="token-avatar" style={{ "--token-accent": market.accent } as React.CSSProperties}>{market.iconLabel}</span>
              {market.ticker}
              <Icon name="chevron" size={14} />
            </button>
          </div>
          <div className="quick-amounts" aria-label="Wallet balance percentages">
            {["25%", "50%", "75%", "MAX"].map((item) => <button type="button" key={item} disabled title="Connect a wallet to use balance shortcuts">{item}</button>)}
            <span>Wallet shortcuts activate after connection</span>
          </div>

          {pickerOpen ? (
            <div className="token-picker">
              <label className="search-field"><Icon name="search" size={16} /><span className="sr-only">Search tokens</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search token or contract" /></label>
              <div className="token-picker__list">
                {matchingMarkets.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setPickerOpen(false); setQuery("") }}>
                    <span className="token-avatar" style={{ "--token-accent": item.accent } as React.CSSProperties}>{item.iconLabel}</span>
                    <span><strong>{item.name}</strong><small>{item.ticker}</small></span>
                    {item.id === market.id ? <Icon name="check" size={16} /> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="swap-direction" aria-hidden="true"><span><Icon name="swap" size={17} /></span></div>

        <section className="swap-field swap-field--receive">
          <header><span>You Receive</span><small>Estimated Output</small></header>
          <div className="swap-field__input">
            <output aria-live="polite">{loading ? "..." : formatNumber(activeRoute?.estimatedOutput ?? 0, 5)}</output>
            <span className="token-select token-select--static"><span className="sol-avatar"><Icon name="sol" size={18} /></span>SOL</span>
          </div>
          <small className="input-caption">Estimate from the local mock quote adapter</small>
        </section>
      </div>

      <div className="swap-route-card">
        <div className="swap-route-card__head"><span><Icon name="transaction" size={16} /> Route</span><span className="demo-badge">NOT LIVE</span></div>
        {quote?.routes.length ? (
          <div className="route-options" role="radiogroup" aria-label="Swap routes">
            {quote.routes.map((route) => (
              <label key={route.id} className={routeId === route.id ? "is-selected" : ""}>
                <input type="radio" name="route" value={route.id} checked={routeId === route.id} onChange={() => setRouteId(route.id)} />
                <span><strong>{route.label}</strong><small>{route.programs.join(" → ")}</small></span>
                <b>{formatNumber(route.estimatedOutput, 5)} SOL</b>
              </label>
            ))}
          </div>
        ) : <div className="inline-empty">No swap route available</div>}
      </div>

      <dl className="swap-summary">
        <div><dt>Estimated Output</dt><dd>{formatNumber(activeRoute?.estimatedOutput ?? 0, 5)} SOL</dd></div>
        <div><dt>Route</dt><dd>{activeRoute?.label ?? "Unavailable"}</dd></div>
        <div><dt>Price Impact</dt><dd>{formatPercent(activeRoute?.priceImpactPercent ?? 0, 2)} <small>EST</small></dd></div>
        <div><dt>Network Fee</dt><dd>{formatSol(activeRoute?.estimatedNetworkFeeSol ?? 0, 5)} <small>EST</small></dd></div>
      </dl>

      <div className="swap-panel__action">
        <p>Quotes are illustrative until a production Solana aggregator is connected</p>
        <button className="button button--primary" type="button" disabled={!activeRoute || loading} onClick={() => setReviewOpen(true)}>
          Review Swap <Icon name="arrow" size={17} />
        </button>
      </div>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} eyebrow="REVIEW ROUTE" title="Review swap route">
        <div className="transaction-preview">
          <div className="preview-banner"><span className="demo-badge">NOT EXECUTABLE</span><p>{quote?.notice}</p></div>
          <div className="swap-review-pair">
            <div><small>YOU PAY</small><strong>{formatNumber(amount)} {market.ticker}</strong></div>
            <Icon name="arrow" size={20} />
            <div><small>YOU RECEIVE</small><strong>{formatNumber(activeRoute?.estimatedOutput ?? 0, 5)} SOL</strong></div>
          </div>
          <div className="preview-route preview-route--compact">
            {activeRoute?.steps.map((step, index) => (
              <div key={`${step.program}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><i /><div><strong>{step.instruction}</strong><small>{step.program}</small><p>{step.description}</p></div></div>
            ))}
          </div>
          <div className="modal-actions"><button className="button button--ghost" type="button" onClick={() => setReviewOpen(false)}>Back to edit</button><button className="button button--primary" type="button" disabled>Wallet integration pending</button></div>
        </div>
      </Modal>
    </div>
  )
}
