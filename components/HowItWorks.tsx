"use client"

import { Icon, type IconName } from "@/components/Icon"
import { useScenePresence } from "@/lib/useScenePresence"

import styles from "./HowItWorks.module.css"

const steps: Array<{
  number: string
  title: string
  description: string
  icon: IconName
}> = [
  {
    number: "01",
    title: "CONNECT",
    description: "Connect a Solana wallet",
    icon: "wallet",
  },
  {
    number: "02",
    title: "VERIFY",
    description: "STAYFI reads wallet positions and supported markets",
    icon: "status",
  },
  {
    number: "03",
    title: "SELECT",
    description: "Choose a migrated token position",
    icon: "token",
  },
  {
    number: "04",
    title: "CONFIGURE",
    description: "Choose collateral and requested liquidity",
    icon: "collateral",
  },
  {
    number: "05",
    title: "EXECUTE",
    description: "Review and approve the transaction route",
    icon: "transaction",
  },
  {
    number: "06",
    title: "RECEIVE",
    description: "Receive SOL after successful execution",
    icon: "sol",
  },
]

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
        </div>

        <div className={`${styles.canvas} page-shell`}>
          <header className={styles.intro}>
            <p className={`${styles.eyebrow} eyebrow`}>How it works</p>
            <h2 id="how-it-works-title">From position to liquidity</h2>
            <p>A reviewable six-step flow from wallet connection to SOL settlement</p>
          </header>

          <div className={styles.routeFrame}>
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
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                </li>
              ))}
            </ol>
          </div>

          <p className={styles.technicalNote}>
            Each approval remains inspectable before the route is submitted to Solana
          </p>
        </div>
      </div>
    </section>
  )
}
