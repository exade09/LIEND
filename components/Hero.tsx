"use client"

import { useEffect, useRef } from "react"

import { Icon } from "@/components/Icon"
import { project } from "@/config/project"

import styles from "./Hero.module.css"

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
      { rootMargin: "-8% 0px", threshold: 0.05 },
    )

    observer.observe(scene)

    return () => observer.disconnect()
  }, [])

  return sceneRef
}

export function Hero() {
  const sceneRef = useScenePresence()

  return (
    <section
      className={styles.story}
      data-presence="idle"
      id="top"
      ref={sceneRef}
      aria-labelledby="hero-title"
    >
      <div className={styles.stage}>
        <div className={styles.atmosphere} aria-hidden="true">
          <div className={styles.baseField} />
          <div className={styles.assetField} />
          <div className={styles.violetSurface} />
          <div className={styles.cyanSurface} />
          <div className={styles.refraction} />
          <div className={styles.coordinateField} />
        </div>

        <div className={`${styles.frame} page-shell`}>
          <div className={styles.topline} aria-hidden="true">
            <span>LIEND / UTILITY LAYER</span>
            <span>NETWORK 01 / SOLANA</span>
          </div>

          <div className={styles.content}>
            <div className={`${styles.eyebrow} eyebrow`}>
              <span className="status-light" />
              <span>Utility liquidity for migrated tokens</span>
              <span className="network-chip">Solana</span>
            </div>

            <div className={styles.sourceWordmark} role="img" aria-label="LIEND">
              <span className={styles.sourceWordmarkImage} aria-hidden="true" />
            </div>

            <h1 className={styles.headline} id="hero-title">
              <span className={styles.positionLine}>Keep the position</span>
              <span className={styles.liquidityLine}>Access the liquidity</span>
            </h1>

            <p className={styles.supportingCopy}>
              Borrow against supported migrated token positions without making a market sale your first move
            </p>

            <div className={styles.actions}>
              <a className="button button--primary" href="#product-stage">
                Launch App
                <Icon name="arrow" size={18} />
              </a>
              <a className="button button--ghost" href="#how-it-works">
                How It Works
              </a>
            </div>

            <div className={styles.secondary}>
              <span className={styles.brandLine}>LEND <b>•</b> BORROW <b>•</b> BUILD</span>
              <a href={project.pumpUrl} target="_blank" rel="noreferrer">
                <Icon name="pump-fun" size={17} />
                Get LIEND on Pump.fun
                <Icon name="external-link" size={14} />
              </a>
            </div>
          </div>

          <ol className={styles.route} aria-label="LIEND product route">
            <li>
              <span>01</span>
              <strong>POSITION</strong>
            </li>
            <li className={styles.routeLine} aria-hidden="true" />
            <li>
              <span>02</span>
              <strong>BORROW</strong>
            </li>
            <li className={styles.routeLine} aria-hidden="true" />
            <li>
              <span>03</span>
              <strong>SOL</strong>
            </li>
          </ol>

          <div className={styles.sideReadout} aria-hidden="true">
            <span>POSITION</span>
            <i />
            <span>LIQUIDITY</span>
          </div>
        </div>

        <a className={styles.scrollCue} href="#product" aria-label="Scroll to the product concept">
          <span>Scroll to follow the route</span>
          <Icon name="chevron" size={14} />
        </a>
      </div>
    </section>
  )
}
