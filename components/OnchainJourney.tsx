"use client"

import { useEffect, useRef, useState } from "react"
import { Icon, type IconName } from "@/components/Icon"
import { SceneLoop } from "@/components/SceneLoop"
import { TransactionTrace } from "@/components/TransactionTrace"
import { project } from "@/config/project"
import { demoTransactions } from "@/data/demoTransactions"
import styles from "./OnchainJourney.module.css"

const routeIcons: Record<string, IconName> = {
  wallet: "wallet",
  "token-account": "token",
  "market-check": "status",
  collateral: "collateral",
  "liend-program": "borrow",
  route: "liquidity",
  swap: "swap",
  settlement: "transaction",
  "wallet-return": "sol",
}

const demonstration = demoTransactions[0]

export function OnchainJourney() {
  const journeyRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const journey = journeyRef.current
    if (!journey) return

    const staticPresentation = window.matchMedia(
      "(max-width: 1100px), (prefers-reduced-motion: reduce)",
    )

    const renderProgress = () => {
      frameRef.current = null

      if (staticPresentation.matches) {
        journey.style.setProperty("--journey-progress", "1")
        journey.style.setProperty("--journey-line", "100%")
        setActiveStep(demonstration.trace.length - 1)
        return
      }

      const bounds = journey.getBoundingClientRect()
      const travel = Math.max(bounds.height - window.innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -bounds.top / travel))
      const nextStep = Math.min(
        demonstration.trace.length - 1,
        Math.floor(progress * demonstration.trace.length),
      )

      journey.style.setProperty("--journey-progress", progress.toFixed(4))
      journey.style.setProperty("--journey-line", `${Math.max(0.045, progress) * 100}%`)
      setActiveStep((current) => (current === nextStep ? current : nextStep))
    }

    const requestRender = () => {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(renderProgress)
    }

    renderProgress()
    window.addEventListener("scroll", requestRender, { passive: true })
    window.addEventListener("resize", requestRender)
    staticPresentation.addEventListener("change", requestRender)

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      window.removeEventListener("scroll", requestRender)
      window.removeEventListener("resize", requestRender)
      staticPresentation.removeEventListener("change", requestRender)
    }
  }, [])

  return (
    <div className={styles.journeyGroup}>
      <section
        className={styles.journey}
        id="onchain"
        ref={journeyRef}
        aria-labelledby="onchain-journey-title"
      >
        <div className={styles.stickyStage}>
          <div className={styles.scene} aria-hidden="true">
            <div className={styles.sceneGrid} />
            <div className={`${styles.surface} ${styles.surfaceViolet}`} />
            <div className={`${styles.surface} ${styles.surfaceCyan}`} />
            <div className={styles.horizon} />
            <SceneLoop src="/assets/loops/rain.gif" className={styles.loop} />
          </div>
          <div className={styles.stageGrid}>
            <header className={styles.intro}>
              <p className={styles.eyebrow}>TRANSACTION CORRIDOR</p>
              <h2 id="onchain-journey-title">
                Follow the route
                {" "}
                <span>all the way through</span>
              </h2>
              <p className={styles.lede}>
                Read Position to Borrow to SOL at a glance, then inspect every
                program interaction in the full transaction trace
              </p>

              <div className={styles.context} aria-label="Route context">
                <span>
                  <Icon name="sol" size={15} />
                  {project.network}
                </span>
              </div>

              <div className={styles.simpleRoute} aria-label="Simple route">
                <span>POSITION</span>
                <Icon name="arrow" size={15} aria-hidden="true" />
                <span>BORROW</span>
                <Icon name="arrow" size={15} aria-hidden="true" />
                <span>SOL</span>
              </div>
            </header>

            <div className={styles.routePanel}>
              <div className={styles.routeLine} aria-hidden="true">
                <span />
              </div>
              <ol className={styles.routeList} aria-label="Full transaction route">
                {demonstration.trace.map((step, index) => {
                  const isCurrent = index === activeStep
                  const isPassed = index <= activeStep

                  return (
                    <li
                      className={`${styles.routeStep} ${isPassed ? styles.isPassed : ""} ${isCurrent ? styles.isCurrent : ""}`.trim()}
                      key={step.id}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span className={styles.routeNode} aria-hidden="true">
                        <Icon name={routeIcons[step.id] ?? "transaction"} size={15} />
                      </span>
                      <span className={styles.routeIndex}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.routeCopy}>
                        <strong>{step.label}</strong>
                        <small>{step.instruction}</small>
                      </span>
                      <span className={styles.routeStatus}>{step.status === "DEMO" ? "" : step.status}</span>
                    </li>
                  )
                })}
              </ol>
            </div>

            <div className={styles.inspector}>
              <TransactionTrace
                className={styles.trace}
                steps={demonstration.trace}
                defaultView="full"
                title="Transaction Trace"
                compact
              />
            </div>
          </div>

          <footer className={styles.stageFooter}>
            <span aria-hidden="true">SCROLL TO FOLLOW ROUTE</span>
          </footer>
        </div>
      </section>
    </div>
  )
}
