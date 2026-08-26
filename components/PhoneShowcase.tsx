"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { LaunchAppLink } from "@/components/ProductLink"

import styles from "./PhoneShowcase.module.css"

type RouteMode = "borrow" | "repay"

const routeCopy = {
  borrow: {
    eyebrow: "Borrow route",
    metricLabel: "You receive",
    metric: "4.26 SOL",
    action: "Review borrow",
    status: "Ready to borrow",
  },
  repay: {
    eyebrow: "Repay route",
    metricLabel: "Amount due",
    metric: "4.26 SOL",
    action: "Review repayment",
    status: "Ready to repay",
  },
} satisfies Record<RouteMode, Record<string, string>>

export function PhoneShowcase() {
  const [mode, setMode] = useState<RouteMode>("borrow")

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMode((current) => current === "borrow" ? "repay" : "borrow")
    }, 4000)

    return () => window.clearInterval(timer)
  }, [])

  const copy = routeCopy[mode]

  return (
    <div className={styles.showcase} data-mode={mode}>
      <div className={styles.stageTop}>
        <span><i /> LIEND MOBILE ROUTE</span>
        <span>LIVE PRODUCT PREVIEW</span>
      </div>

      <div className={styles.stage}>
        <div className={styles.sideRail} data-side="left" aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.sideRail} data-side="right" aria-hidden="true"><i /><i /><i /></div>

        <div className={[styles.phoneWrap, styles.phoneLeft].join(" ")}>
          <div className={styles.phone}>
            <span className={styles.sideButton} aria-hidden="true" />
            <div className={styles.phoneScreen}>
              <div className={styles.phoneStatus}><span>9:41</span><span>5G&nbsp;&nbsp;100%</span></div>
              <div className={styles.mobileBrand}>
                <Image src="/assets/logo/pixel/liend-mark.png" alt="" width={42} height={42} unoptimized />
                <strong>LIEND</strong>
                <i />
              </div>

              <section className={styles.balance}>
                <span>Portfolio value</span>
                <strong>$150.00</strong>
                <small>PUMP.FUN POSITION</small>
              </section>

              <div className={styles.routeTabs} role="group" aria-label="Preview route">
                {(["borrow", "repay"] as const).map((item) => (
                  <button
                    type="button"
                    key={item}
                    data-active={mode === item}
                    aria-pressed={mode === item}
                    onClick={() => setMode(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <section className={styles.positionCard}>
                <div className={styles.tokenRow}>
                  <span className={styles.tokenMark}>P</span>
                  <div><strong>Pump.fun token</strong><small>Supported position</small></div>
                  <b>$150.00</b>
                </div>
                <div className={styles.positionMeta}>
                  <span>Collateral value</span><strong>$150.00</strong>
                </div>
                <div className={styles.positionMeta}>
                  <span>Route state</span><strong>{copy.status}</strong>
                </div>
              </section>

              <nav className={styles.phoneNav} aria-label="Mobile preview navigation">
                <span data-active="true">Home</span><span>Positions</span><span>Loans</span>
              </nav>
            </div>
          </div>
        </div>

        <div className={[styles.phoneWrap, styles.phoneRight].join(" ")}>
          <div className={styles.phone}>
            <span className={styles.sideButton} aria-hidden="true" />
            <div className={styles.phoneScreen}>
              <div className={styles.phoneStatus}><span>9:41</span><span>5G&nbsp;&nbsp;100%</span></div>
              <header className={styles.routeHeader}>
                <span>{copy.eyebrow}</span>
                <strong>{mode === "borrow" ? "Position to SOL" : "SOL to position"}</strong>
              </header>

              <section className={styles.receiveCard} aria-live="polite">
                <span>{copy.metricLabel}</span>
                <strong>{copy.metric}</strong>
                <small>Based on the $150 pump.fun position</small>
              </section>

              <section className={styles.reviewCard}>
                <div><span>Position</span><strong>Pump.fun token</strong></div>
                <div><span>Position value</span><strong>$150.00</strong></div>
                <div><span>Network</span><strong>Solana</strong></div>
                <div><span>Approval</span><strong>Your wallet</strong></div>
              </section>

              <LaunchAppLink className={styles.reviewButton}>
                {copy.action}
                <span aria-hidden="true">-&gt;</span>
              </LaunchAppLink>

              <p className={styles.disclaimer}>Preview only / final terms appear in the LIEND app</p>
            </div>
          </div>
        </div>

        <div className={styles.stageSignal} aria-hidden="true">
          <span>01</span><i /><i /><i /><span>LIEND / MOBILE</span>
        </div>
      </div>
    </div>
  )
}
