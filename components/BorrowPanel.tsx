"use client"

import { useMemo, useState } from "react"
import { Icon } from "@/components/Icon"
import { Modal } from "@/components/Modal"
import { formatCurrency, formatNumber, formatPercent, formatSol } from "@/lib/formatting"
import { calculateLtv, getHealthState } from "@/lib/calculations"
import { getBorrowQuote } from "@/services/borrowing"
import type { BorrowQuote, Market } from "@/types"

type BorrowPanelProps = {
  market: Market
}

const ESTIMATED_SOL_PRICE = 150

export function BorrowPanel({ market }: BorrowPanelProps) {
  const [collateralAmount, setCollateralAmount] = useState(market.ticker === "STAYFI" ? 100000 : 25000)
  const [borrowAmount, setBorrowAmount] = useState(1)
  const [quote, setQuote] = useState<BorrowQuote | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const collateralValue = Math.max(collateralAmount, 0) * market.priceUsd
  const borrowValue = Math.max(borrowAmount, 0) * ESTIMATED_SOL_PRICE
  const ltv = calculateLtv(borrowValue, collateralValue)
  const health = collateralValue > 0 ? getHealthState(ltv) : "Unavailable"
  const fee = Math.max(borrowAmount, 0) * 0.003
  const canReview = market.eligible && collateralAmount > 0 && borrowAmount > 0 && ltv <= 65

  const route = useMemo(
    () => ["Position check", "Market verify", "Collateral", "STAYFI program", "SOL settlement"],
    [],
  )

  const review = async () => {
    setLoading(true)
    setError("")
    try {
      const nextQuote = await getBorrowQuote({
        marketId: market.id,
        collateralAmount,
        borrowAmountSol: borrowAmount,
      })
      setQuote(nextQuote)
      setReviewOpen(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to prepare the quote")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="borrow-panel">
      <div className="panel-heading">
        <div>
          <span className="overline">BORROWING ROUTE</span>
          <h3>Configure a SOL borrow</h3>
        </div>
        <div className="panel-heading__meta">
          <span className="network-chip">Solana</span>
        </div>
      </div>

      <div className="borrow-grid">
        <section className="form-module">
          <header>
            <span className="module-icon"><Icon name="collateral" size={19} /></span>
            <div><span>01</span><h4>Collateral</h4></div>
          </header>

          <div className="selected-asset">
            <span className="token-avatar" style={{ "--token-accent": market.accent } as React.CSSProperties}>{market.iconLabel}</span>
            <div><strong>{market.name}</strong><small>{market.ticker}</small></div>
            <span className="selected-asset__tag">SELECTED TOKEN</span>
          </div>

          <label className="amount-field">
            <span>Collateral Amount</span>
            <div>
              <input
                type="number"
                min="0"
                step="100"
                value={collateralAmount}
                onChange={(event) => setCollateralAmount(Number(event.target.value))}
                aria-label={`Collateral amount in ${market.ticker}`}
              />
              <strong>{market.ticker}</strong>
            </div>
            <small>Estimated value {formatCurrency(collateralValue)}</small>
          </label>

          <dl className="form-stats">
            <div><dt>Wallet Balance</dt><dd className="muted">Not connected</dd></div>
            <div><dt>Position Value</dt><dd>{formatCurrency(collateralValue)} <small>EST</small></dd></div>
          </dl>
        </section>

        <div className="borrow-route-bridge" aria-hidden="true">
          <span><Icon name="arrow" size={17} /></span>
        </div>

        <section className="form-module form-module--borrow">
          <header>
            <span className="module-icon module-icon--cyan"><Icon name="borrow" size={19} /></span>
            <div><span>02</span><h4>Borrow</h4></div>
          </header>

          <div className="selected-asset">
            <span className="sol-avatar"><Icon name="sol" size={20} /></span>
            <div><strong>Solana</strong><small>SOL</small></div>
            <span className="selected-asset__tag">BORROW ASSET</span>
          </div>

          <label className="amount-field">
            <span>Borrow Amount</span>
            <div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={borrowAmount}
                onChange={(event) => setBorrowAmount(Number(event.target.value))}
                aria-label="Borrow amount in SOL"
              />
              <strong>SOL</strong>
            </div>
            <small>Estimated value {formatCurrency(borrowValue)}</small>
          </label>

          <dl className="form-stats">
            <div><dt>Estimated LTV</dt><dd>{formatPercent(ltv)} <small>EST</small></dd></div>
            <div><dt>Estimated Health</dt><dd><span className={`health-state health-state--${health.toLowerCase().replace(" ", "-")}`}>{health}</span></dd></div>
          </dl>
        </section>
      </div>

      <div className="route-preview">
        <div className="route-preview__label">
          <Icon name="transaction" size={17} />
          <span>ROUTE</span>
        </div>
        <div className="route-preview__steps">
          {route.map((step, index) => (
            <span key={step}>{step}{index < route.length - 1 ? <i /> : null}</span>
          ))}
        </div>
        <span className="route-preview__count">5 STAGES</span>
      </div>

      <div className="borrow-summary">
        <dl>
          <div><dt>Collateral</dt><dd>{formatNumber(collateralAmount)} {market.ticker}</dd></div>
          <div><dt>Borrowed</dt><dd>{formatSol(borrowAmount)}</dd></div>
          <div><dt>Remaining Position</dt><dd className="muted">-- <small>WALLET REQUIRED</small></dd></div>
          <div><dt>Protocol Fee</dt><dd>{formatSol(fee, 5)} <small>EST</small></dd></div>
          <div><dt>Network Cost</dt><dd>0.00002 SOL <small>EST</small></dd></div>
        </dl>
        <div className="borrow-summary__action">
          {ltv > 65 ? <span className="field-error">Reduce borrow amount to review this route</span> : null}
          {error ? <span className="field-error">{error}</span> : null}
          <button className="button button--primary" type="button" disabled={!canReview || loading} onClick={review}>
            {loading ? <><span className="button-spinner" />Preparing Preview</> : <>Review Borrow <Icon name="arrow" size={17} /></>}
          </button>
        </div>
      </div>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} eyebrow="REVIEW ROUTE" title="Review borrow route" size="wide">
        {quote ? (
          <div className="transaction-preview">
            <div className="preview-banner">
              {quote.notice && !/demo/i.test(quote.notice) ? <p>{quote.notice}</p> : null}
            </div>
            <div className="preview-route">
              {quote.route.map((step, index) => (
                <div key={`${step.program}-${step.instruction}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i />
                  <div><strong>{step.instruction}</strong><small>{step.program}</small><p>{step.description}</p></div>
                </div>
              ))}
            </div>
            <dl className="preview-summary">
              <div><dt>Collateral</dt><dd>{formatNumber(quote.collateralAmount)} {quote.collateralTicker}</dd></div>
              <div><dt>Borrow</dt><dd>{formatSol(quote.borrowAmountSol)}</dd></div>
              <div><dt>Estimated LTV</dt><dd>{formatPercent(quote.estimatedLtvPercent)}</dd></div>
              <div><dt>Wallet approval</dt><dd>Required for live execution</dd></div>
            </dl>
            <div className="risk-note">
              <Icon name="status" size={18} />
              <p>Borrowing can expose collateral to liquidation when active risk thresholds are reached</p>
            </div>
            <div className="modal-actions">
              <button className="button button--ghost" type="button" onClick={() => setReviewOpen(false)}>Back to edit</button>
              <button className="button button--primary" type="button" disabled>Wallet integration pending</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
