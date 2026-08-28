"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { LaunchAppLink } from "@/components/ProductLink"

import styles from "./PhoneShowcase.module.css"

type RouteMode = "borrow" | "repay"

const routeCopy = {
  borrow: {
    eyebrow: "Borrow route",
    metricLabel: "You receive",
    metric: "Live ETH quote",
    action: "Review borrow",
    status: "Ready to borrow",
  },
  repay: {
    eyebrow: "Repay route",
    metricLabel: "Amount due",
    metric: "Live ETH quote",
    action: "Review repayment",
    status: "Ready to repay",
  },
} satisfies Record<RouteMode, Record<string, string>>

function PonsMark() {
  return (
    <svg className={styles.pumpMark} viewBox="0 0 64 64" aria-label="pons">
      <defs>
        <linearGradient id="pons-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c8ff4d" />
          <stop offset="1" stopColor="#00a971" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="54" height="54" rx="18" fill="#111716" stroke="#c8ff4d" strokeWidth="3" />
      <path d="M19 47V17h15.5c8.2 0 13.5 4.7 13.5 12s-5.3 12-13.5 12H28v6h-9Zm9-14h6c3.2 0 5-1.4 5-4s-1.8-4-5-4h-6v8Z" fill="url(#pons-gradient)" />
    </svg>
  )
}

export function PhoneShowcase() {
  const [mode, setMode] = useState<RouteMode>("borrow")
  const [visible, setVisible] = useState(false)
  const showcaseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const showcase = showcaseRef.current
    if (!showcase) return

    const revealFromNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ href?: string }>).detail
      if (detail?.href === "#surfaces") setVisible(true)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: "-5% 0px -8%", threshold: 0.06 },
    )
    observer.observe(showcase)
    window.addEventListener("liend:scene-enter", revealFromNavigation)

    return () => {
      observer.disconnect()
      window.removeEventListener("liend:scene-enter", revealFromNavigation)
    }
  }, [])

  const copy = routeCopy[mode]

  return (
    <div ref={showcaseRef} className={styles.showcase} data-mode={mode} data-visible={visible ? "true" : "false"}>
      <div className={styles.stageTop}>
        <span><i /> LONS MOBILE ROUTE</span>
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
                <Image src="/assets/lons-mark.png" alt="" width={42} height={42} />
                <strong>LONS</strong>
                <i />
              </div>

              <section className={styles.balance}>
                <span>Portfolio value</span>
                <strong>$150.00</strong>
                <small>PONS POSITION</small>
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
                  <span className={styles.tokenMark}><PonsMark /></span>
                  <div><strong>pons token</strong><small>Robinhood Chain position</small></div>
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
                <strong>{mode === "borrow" ? "Position to ETH" : "ETH to position"}</strong>
              </header>

              <section className={styles.receiveCard} aria-live="polite">
                <span>{copy.metricLabel}</span>
                <strong>{copy.metric}</strong>
                <small>Calculated from the connected $150 pons position</small>
              </section>

              <section className={styles.reviewCard}>
                <div><span>Position</span><strong>pons token</strong></div>
                <div><span>Position value</span><strong>$150.00</strong></div>
                <div><span>Network</span><strong>Robinhood Chain</strong></div>
                <div><span>Approval</span><strong>MetaMask</strong></div>
              </section>

              <LaunchAppLink className={styles.reviewButton}>
                {copy.action}
                <span aria-hidden="true">-&gt;</span>
              </LaunchAppLink>

              <p className={styles.disclaimer}>Preview only / final terms appear in the LONS app</p>
            </div>
          </div>
        </div>

        <div className={styles.stageSignal} aria-hidden="true">
          <span>01</span><i /><i /><i /><span>LONS / MOBILE</span>
        </div>
      </div>
    </div>
  )
}
