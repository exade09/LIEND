"use client"

import { useEffect, useRef } from "react"
import { ActivityFeed } from "@/components/ActivityFeed"
import { LoanCalculator } from "@/components/LoanCalculator"
import { SceneMedia } from "@/components/SceneMedia"
import styles from "./DataExperience.module.css"

export default function DataExperience() {
  const experienceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const experience = experienceRef.current
    if (!experience) return

    const revealItems = Array.from(experience.querySelectorAll<HTMLElement>("[data-reveal]"))
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const showIfInView = () => {
      const viewportBottom = window.innerHeight
      revealItems.forEach((item) => {
        if (item.getAttribute("data-visible") === "true") return
        const bounds = item.getBoundingClientRect()
        if (bounds.top < viewportBottom && bounds.bottom > 0) {
          item.setAttribute("data-visible", "true")
        }
      })
    }

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.setAttribute("data-visible", "true"))
      return
    }

    const start = window.requestAnimationFrame(() => {
      showIfInView()
      experience.setAttribute("data-reveal-ready", "true")
      showIfInView()
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute("data-visible", "true")
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    )

    revealItems.forEach((item) => observer.observe(item))
    window.addEventListener("scroll", showIfInView, { passive: true })
    window.addEventListener("resize", showIfInView)

    return () => {
      window.cancelAnimationFrame(start)
      window.removeEventListener("scroll", showIfInView)
      window.removeEventListener("resize", showIfInView)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={experienceRef} className={styles.experience}>
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.skyFill}>
          <SceneMedia src="/assets/webcore-sky.png" pixelated />
        </div>
        <span className={styles.veil} />
      </div>

      <section className={`${styles.scene} ${styles.labScene}`} id="liquidity-lab" aria-labelledby="liquidity-lab-title">
        <div className={styles.shell}>
          <header className={`${styles.sceneIntro} ${styles.labIntro}`} data-reveal>
            <p className={styles.eyebrow}>LIQUIDITY LAB</p>
            <h2 id="liquidity-lab-title">Model the position before the wallet</h2>
            <p className={styles.introCopy}>Explore collateral, estimated SOL and remaining exposure through a transparent public model</p>
          </header>

          <div className={`${styles.componentMount} ${styles.calculatorMount}`} data-reveal>
            <LoanCalculator />
          </div>
        </div>
      </section>

      <section className={`${styles.scene} ${styles.dataScene}`} id="protocol-data" aria-labelledby="protocol-data-title">
        <div className={styles.dataLinework} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles.shell}>
          <header className={`${styles.sceneIntro} ${styles.dataIntro}`} data-reveal>
            <div>
              <p className={styles.eyebrow}>PROTOCOL DATA</p>
              <h2 id="protocol-data-title">Read activity as infrastructure</h2>
            </div>
            <div className={styles.dataContext}>
              <p>Public Solana routes on this desk. LIEND program records replace this when the book is onchain</p>
              <span><i /> SOLANA &bull; LIVE ROUTES</span>
            </div>
          </header>

          <div className={styles.analyticsField}>
            <div className={`${styles.componentMount} ${styles.analyticsMount}`} data-reveal>
              <ActivityFeed />
            </div>
          </div>

          <footer className={styles.dataFooter} data-reveal>
            <span>PUBLIC ANALYTICS LAYER</span>
          </footer>
        </div>
      </section>
    </div>
  )
}
