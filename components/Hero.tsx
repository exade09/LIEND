"use client"

import { useRef } from "react"

import { Icon } from "@/components/Icon"
import { LiquidCurtain } from "@/components/LiquidCurtain"
import { Wordmark } from "@/components/Wordmark"
import { ExtensionCta, LaunchAppLink, ProductLink } from "@/components/ProductLink"
import { project } from "@/config/project"
import { useScenePresence } from "@/lib/useScenePresence"

import styles from "./Hero.module.css"

export function Hero() {
  const sceneRef = useScenePresence("-8% 0px")
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <section
      className={styles.story}
      data-presence="idle"
      ref={sceneRef}
      aria-labelledby="hero-title"
    >
      <span id="top" className={styles.topAnchor} aria-hidden="true" />

      <div className={styles.stage} ref={stageRef}>
        <div className={styles.atmosphere} aria-hidden="true">
          <div className={styles.baseField} />
        </div>

        <div className={`${styles.frame} page-shell`}>
          <div className={styles.content}>
            <div className={`${styles.eyebrow} eyebrow`}>
              <span className="status-light" />
              <span>Utility liquidity for migrated tokens</span>
              <span className="network-chip">Solana</span>
            </div>

            <div className={styles.wordmarkSlot}>
              <Wordmark />
            </div>

            <h1 className={styles.headline} id="hero-title">
              <span className={styles.positionLine}>Keep the position</span>
              <span className={styles.liquidityLine}>Access the liquidity</span>
            </h1>

            <p className={styles.supportingCopy}>
              Borrow against supported migrated token positions without making a market sale your first move
            </p>

            <div className={styles.actions}>
              <LaunchAppLink />
              <ExtensionCta />
            </div>

            <div className={styles.secondary}>
              <span className={styles.brandLine}>LEND <b>•</b> BORROW <b>•</b> BUILD</span>
              <ProductLink href={project.pumpUrl}>
                <Icon name="pump-fun" size={17} />
                Get LIEND on Pump.fun
                <Icon name="external-link" size={14} />
              </ProductLink>
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
        </div>

        <LiquidCurtain storyRef={sceneRef} stageRef={stageRef} />

        <a className={styles.scrollCue} href="#product" aria-label="Scroll to the product concept">
          <span>Scroll to follow the route</span>
          <Icon name="chevron" size={14} />
        </a>
      </div>
    </section>
  )
}
