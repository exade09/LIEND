"use client"

import { useMemo, useState } from "react"
import { SectionHeading } from "@/components/SectionHeading"
import { calculateLoanEstimate } from "@/lib/calculations"
import { formatCurrency, formatPercent, formatEth } from "@/lib/formatting"

export function LoanCalculator() {
  const [tokenValue, setTokenValue] = useState(5000)
  const [collateral, setCollateral] = useState(60)
  const [borrow, setBorrow] = useState(35)

  const result = useMemo(
    () => calculateLoanEstimate({ tokenValueUsd: tokenValue, collateralPercent: collateral, borrowPercent: borrow, ethPriceUsd: 150 }),
    [borrow, collateral, tokenValue],
  )

  return (
    <section className="section calculator-section" id="calculator">
      <div className="page-shell">
        <SectionHeading
          index="05"
          eyebrow="PUBLIC CALCULATOR"
          title={<>Model the position <span className="accent-text">before connecting</span></>}
          copy={<><p>Explore an illustrative collateral and borrow relationship using transparent assumptions</p></>}
        />

        <div className="calculator-shell">
          <div className="calculator-controls">
            <div className="calculator-value-field">
              <label htmlFor="token-value">Token value</label>
              <div><span>$</span><input id="token-value" type="number" min="0" step="100" value={tokenValue} onChange={(event) => setTokenValue(Math.max(Number(event.target.value), 0))} /></div>
              <small>Illustrative USD position value</small>
            </div>

            <label className="range-control">
              <div><span>Collateral</span><output>{collateral}%</output></div>
              <input type="range" min="0" max="100" step="1" value={collateral} onChange={(event) => setCollateral(Number(event.target.value))} style={{ "--range-progress": `${collateral}%` } as React.CSSProperties} />
              <span className="range-labels"><small>0%</small><small>POSITION ALLOCATION</small><small>100%</small></span>
            </label>

            <label className="range-control">
              <div><span>Borrow</span><output>{borrow}%</output></div>
              <input type="range" min="0" max="65" step="1" value={borrow} onChange={(event) => setBorrow(Number(event.target.value))} style={{ "--range-progress": `${(borrow / 65) * 100}%` } as React.CSSProperties} />
              <span className="range-labels"><small>0%</small><small>OF COLLATERAL VALUE</small><small>65%</small></span>
            </label>
          </div>

          <div className="calculator-route" aria-hidden="true">
            <span>POSITION</span><i /><span>COLLATERAL</span><i /><span>ETH</span>
          </div>

          <div className="calculator-output">
            <header><span>ESTIMATED OUTPUT</span></header>
            <div className="calculator-output__primary">
              <span>Estimated ETH</span>
              <strong>{formatEth(result.estimatedEth, 4)}</strong>
              <small>Using an illustrative ETH price of $150</small>
            </div>
            <dl>
              <div><dt>Position Value</dt><dd>{formatCurrency(result.positionValueUsd)}</dd></div>
              <div><dt>Collateral Value</dt><dd>{formatCurrency(result.collateralValueUsd)}</dd></div>
              <div><dt>Remaining Exposure</dt><dd>{formatCurrency(result.remainingExposureUsd)}</dd></div>
              <div><dt>Example LTV</dt><dd>{formatPercent(result.exampleLtvPercent)}</dd></div>
              <div><dt>Health State</dt><dd><span className={`health-state health-state--${result.healthState.toLowerCase().replace(" ", "-")}`}>{result.healthState}</span></dd></div>
            </dl>
            <p>Actual availability, valuation, rates and liquidation parameters depend on live market conditions and active LONS configuration</p>
          </div>
        </div>
      </div>
    </section>
  )
}
