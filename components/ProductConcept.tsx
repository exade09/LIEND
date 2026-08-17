"use client"

import { Icon } from "@/components/Icon"
import { useScenePresence } from "@/lib/useScenePresence"

import styles from "./ProductConcept.module.css"

const sellRoute = ["Token", "Market Sale", "SOL", "Position Reduced"] as const
const liendRoute = ["Token", "Position", "Borrow", "SOL", "Exposure Maintained"] as const

function Route({
  label,
  steps,
  variant,
}: {
  label: string
  steps: readonly string[]
  variant: "sell" | "liend"
}) {
  return (
    <article className={`${styles.route} ${variant === "sell" ? styles.sellRoute : styles.liendRoute}`}>
      <header className={styles.routeHeader}>
        <span className={styles.routeMarker} aria-hidden="true" />
        <div>
          <span>{variant === "sell" ? "EXISTING ACTION" : "ADDITIONAL ACTION"}</span>
          <h3>{label}</h3>
        </div>
      </header>

      <ol className={styles.steps} aria-label={`${label} route`}>
        {steps.map((step, index) => (
          <li className={styles.step} key={step}>
            <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            {index < steps.length - 1 ? (
              <span className={styles.connector} aria-hidden="true">
                <i />
                <Icon name="arrow" size={14} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </article>
  )
}

export function ProductConcept() {
  const sceneRef = useScenePresence()

  return (
    <section
      className={styles.story}
      data-presence="idle"
      id="product"
      ref={sceneRef}
      aria-labelledby="product-concept-title"
    >
      <div className={styles.stage}>
        <div className={styles.atmosphere} aria-hidden="true">
          <div className={styles.baseField} />
        </div>

        <div className={`${styles.canvas} page-shell`}>
          <header className={styles.intro}>
            <p className={`${styles.eyebrow} eyebrow`}>Another route to liquidity</p>
            <h2 id="product-concept-title">
              <span>Selling is one route</span>
              <span>LIEND adds another</span>
            </h2>
            <p>
              Use supported migrated token positions inside a borrowing flow instead of making a market sale
              your first move
            </p>
          </header>

          <div className={styles.comparison}>
            <Route label="SELL" steps={sellRoute} variant="sell" />

            <div className={styles.pivot} aria-hidden="true">
              <span>OR</span>
              <i />
            </div>

            <Route label="LIEND" steps={liendRoute} variant="liend" />
          </div>

          <div className={styles.footnote}>
            <span>Token holder decision layer</span>
            <p>Borrowing involves collateral, liquidity and liquidation risk</p>
          </div>
        </div>
      </div>
    </section>
  )
}
