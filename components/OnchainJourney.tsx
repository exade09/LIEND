"use client"

import { useEffect, useRef, useState } from "react"
import { Icon, type IconName } from "@/components/Icon"
import { project } from "@/config/project"
import styles from "./OnchainJourney.module.css"

const routeIcons: Record<string, IconName> = {
  position: "collateral",
  "market-check": "status",
  borrow: "borrow",
  "wallet-return": "eth",
}

const currentWalletBalance = "112.041 ETH"

const routeSteps = [
  {
    id: "position",
    label: "POSITION",
    instruction: "Select supported collateral",
  },
  {
    id: "market-check",
    label: "MARKET CHECK",
    instruction: "Review eligibility and available liquidity",
  },
  {
    id: "borrow",
    label: "BORROW",
    instruction: "Confirm the ETH amount",
  },
  {
    id: "wallet-return",
    label: "WALLET",
    instruction: "Receive ETH in the destination wallet",
    value: currentWalletBalance,
  },
] as const

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
        setActiveStep(routeSteps.length - 1)
        return
      }

      const bounds = journey.getBoundingClientRect()
      const travel = Math.max(bounds.height - window.innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -bounds.top / travel))
      const nextStep = Math.min(
        routeSteps.length - 1,
        Math.floor(progress * routeSteps.length),
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
          <div className={styles.stageGrid}>
            <header className={styles.intro}>
              <p className={styles.eyebrow}>TRANSACTION CORRIDOR</p>
              <h2 id="onchain-journey-title">
                Follow the route
                {" "}
                <span>all the way through</span>
              </h2>
              <p className={styles.lede}>
                See the client path from a supported position to borrowed ETH,
                with only the checks and wallet information needed to understand the route
              </p>

              <div className={styles.context} aria-label="Route context">
                <span>
                  <Icon name="eth" size={15} />
                  {project.network}
                </span>
              </div>

              <div className={styles.simpleRoute} aria-label="Simple route">
                <span>POSITION</span>
                <Icon name="arrow" size={15} aria-hidden="true" />
                <span>BORROW</span>
                <Icon name="arrow" size={15} aria-hidden="true" />
                <span>ETH</span>
              </div>
            </header>

            <div className={styles.routePanel}>
              <div className={styles.routeLine} aria-hidden="true">
                <span />
              </div>
              <ol className={styles.routeList} aria-label="Client borrow route">
                {routeSteps.map((step, index) => {
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
                      {"value" in step ? (
                        <span className={styles.routeStatus}>{step.value}</span>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </div>

            <aside className={styles.clientPanel} aria-labelledby="client-route-summary">
              <div className={styles.panelHeader}>
                <span>CLIENT ROUTE</span>
                <Icon name="liquidity" size={17} />
              </div>
              <h3 id="client-route-summary">What this route means</h3>
              <p>
                Choose a supported position, review the available borrow route,
                confirm the amount, and receive ETH in the destination wallet
              </p>
              <dl className={styles.routeFacts}>
                <div>
                  <dt>FLOW</dt>
                  <dd>POSITION / BORROW / ETH</dd>
                </div>
                <div>
                  <dt>DESTINATION</dt>
                  <dd>WALLET</dd>
                </div>
                <div className={styles.walletFact}>
                  <dt>CURRENT WALLET</dt>
                  <dd>{currentWalletBalance}</dd>
                </div>
              </dl>
              <p className={styles.panelNote}>
                Route guide only. No simulated signature, slot, or execution status
              </p>
            </aside>
          </div>

          <footer className={styles.stageFooter}>
            <span aria-hidden="true">SCROLL TO FOLLOW ROUTE</span>
          </footer>
        </div>
      </section>
    </div>
  )
}
