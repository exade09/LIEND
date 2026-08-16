"use client"

import { useEffect, useRef } from "react"

import { Icon, type IconName } from "@/components/Icon"

import styles from "./HowItWorks.module.css"

const steps: Array<{
  number: string
  title: string
  description: string
  icon: IconName
  signal: string
}> = [
  {
    number: "01",
    title: "CONNECT",
    description: "Connect a Solana wallet",
    icon: "wallet",
    signal: "WALLET LINK",
  },
  {
    number: "02",
    title: "VERIFY",
    description: "LIEND reads wallet positions and supported markets",
    icon: "status",
    signal: "POSITION READ",
  },
  {
    number: "03",
    title: "SELECT",
    description: "Choose a migrated token position",
    icon: "token",
    signal: "MARKET FOUND",
  },
  {
    number: "04",
    title: "CONFIGURE",
    description: "Choose collateral and requested liquidity",
    icon: "collateral",
    signal: "QUOTE READY",
  },
  {
    number: "05",
    title: "EXECUTE",
    description: "Review and approve the transaction route",
    icon: "transaction",
    signal: "PROGRAM ROUTE",
  },
  {
    number: "06",
    title: "RECEIVE",
    description: "Receive SOL after successful execution",
    icon: "sol",
    signal: "SOL SETTLED",
  },
]

function useScenePresence() {
  const sceneRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const scene = sceneRef.current

    if (!scene) return

    scene.dataset.presence = "ready"

    if (!("IntersectionObserver" in window)) {
      scene.dataset.presence = "visible"
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        scene.dataset.presence = "visible"
        observer.disconnect()
      },
      { rootMargin: "-10% 0px", threshold: 0.05 },
    )

    observer.observe(scene)

    return () => observer.disconnect()
  }, [])

  return sceneRef
}

export function HowItWorks() {
  const sceneRef = useScenePresence()

  return (
    <section
      className={styles.story}
      data-presence="idle"
      id="how-it-works"
      ref={sceneRef}
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.stage}>
        <div className={styles.atmosphere} aria-hidden="true">
          <div className={styles.baseField} />
          <div className={styles.corridorField} />
          <div className={styles.gridField} />
          <div className={styles.sweep} />
        </div>

        <div className={`${styles.canvas} page-shell`}>
          <header className={styles.intro}>
            <p className={`${styles.eyebrow} eyebrow`}>
              <span>03</span>
              How it works
            </p>
            <h2 id="how-it-works-title">From position to liquidity</h2>
            <p>A reviewable six-step flow from wallet connection to SOL settlement</p>
          </header>

          <div className={styles.routeFrame}>
            <div className={styles.routeTopline}>
              <span>LIEND EXECUTION SEQUENCE</span>
              <span>SIMPLE ROUTE / 06 CHECKPOINTS</span>
            </div>

            <div className={styles.track} aria-hidden="true">
              <i />
            </div>

            <ol className={styles.route}>
              {steps.map((step) => (
                <li className={styles.step} key={step.number}>
                  <div className={styles.node} aria-hidden="true">
                    <span>{step.number}</span>
                    <Icon name={step.icon} size={19} />
                  </div>
                  <article>
                    <span className={styles.signal}>{step.signal}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                </li>
              ))}
            </ol>

            <div className={styles.routeReadout} aria-hidden="true">
              <span>WALLET</span>
              <i />
              <span>POSITION</span>
              <i />
              <span>LIEND PROGRAM</span>
              <i />
              <span>SOL</span>
            </div>
          </div>

          <p className={styles.technicalNote}>
            Each approval remains inspectable before the route is submitted to Solana
          </p>
        </div>
      </div>
    </section>
  )
}
