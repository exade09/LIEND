"use client"

import { useRef } from "react"

import { CaPlaque } from "@/components/CaPlaque"
import { LiquidCurtain } from "@/components/LiquidCurtain"
import { Wordmark } from "@/components/Wordmark"
import { useScenePresence } from "@/lib/useScenePresence"

import styles from "./Hero.module.css"

export function Hero({ initialMint = null }: { initialMint?: string | null }) {
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
          <img
            className={styles.heroBanner}
            src="/assets/hero/pixel-ascent.png"
            alt=""
            draggable={false}
            decoding="async"
          />
          <div className={styles.heroWash} />
          <div className={styles.baseField} />
        </div>

        <div className={`${styles.frame} page-shell`}>
          <div className={styles.content}>
            <h1 className="sr-only" id="hero-title">
              Keep the position. Access the liquidity.
            </h1>
            <div className={styles.wordmarkSlot}>
              <Wordmark />
            </div>
          </div>
          <div className={styles.caSlot}>
            <CaPlaque variant="hero" initialMint={initialMint} />
          </div>
        </div>

        <LiquidCurtain storyRef={sceneRef} stageRef={stageRef} />
      </div>
    </section>
  )
}
