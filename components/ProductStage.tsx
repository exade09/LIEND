"use client"

import {
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { Application } from "@/components/Application"
import { HolderGate } from "@/components/HolderGate"
import styles from "./ProductStage.module.css"

export type ProductStageStep = {
  id: "access" | "markets" | "configure" | "trace" | string
  label: string
  caption: string
}

type ProductStageProps = {
  access?: ReactNode
  application?: ReactNode
  steps?: readonly ProductStageStep[]
  className?: string
}

type StagePane = "access" | "application"

const defaultSteps: readonly ProductStageStep[] = [
  {
    id: "access",
    label: "Access",
    caption: "Verify LIEND holder access through a standard wallet provider",
  },
  {
    id: "markets",
    label: "Markets",
    caption: "Inspect supported migrated positions and available market data",
  },
  {
    id: "configure",
    label: "Configure",
    caption: "Set collateral and review estimated borrowing parameters",
  },
  {
    id: "trace",
    label: "Trace",
    caption: "Inspect every instruction before a transaction is built",
  },
]

type StageStyle = CSSProperties & {
  "--product-stage-progress": string
  "--product-stage-steps": number
}

export default function ProductStage({
  access = <HolderGate />,
  application,
  steps = defaultSteps,
  className,
}: ProductStageProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const activeIndexRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [linearFlow, setLinearFlow] = useState(false)
  const [focusedPane, setFocusedPane] = useState<StagePane | null>(null)
  const headingId = useId()
  const stepCount = Math.max(steps.length, 1)

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const compactLayoutQuery = window.matchMedia("(max-width: 900px)")

    const updateLayoutMode = () => {
      setLinearFlow(reducedMotionQuery.matches || compactLayoutQuery.matches)
    }

    updateLayoutMode()
    reducedMotionQuery.addEventListener("change", updateLayoutMode)
    compactLayoutQuery.addEventListener("change", updateLayoutMode)

    return () => {
      reducedMotionQuery.removeEventListener("change", updateLayoutMode)
      compactLayoutQuery.removeEventListener("change", updateLayoutMode)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || linearFlow) {
      section?.style.setProperty("--product-stage-progress", "0")
      return
    }

    const updateProgress = () => {
      animationFrameRef.current = null
      const bounds = section.getBoundingClientRect()
      const scrollableDistance = Math.max(bounds.height - window.innerHeight, 1)
      const progress = Math.min(Math.max(-bounds.top / scrollableDistance, 0), 1)
      const nextIndex = Math.min(Math.floor(progress * stepCount), stepCount - 1)

      section.style.setProperty("--product-stage-progress", progress.toFixed(4))
      if (nextIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextIndex
        setActiveIndex(nextIndex)
      }
    }

    const requestUpdate = () => {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(updateProgress)
      }
    }

    updateProgress()
    window.addEventListener("scroll", requestUpdate, { passive: true })
    window.addEventListener("resize", requestUpdate)

    return () => {
      window.removeEventListener("scroll", requestUpdate)
      window.removeEventListener("resize", requestUpdate)
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [linearFlow, stepCount])

  const navigateToStep = useCallback((index: number) => {
    const section = sectionRef.current
    if (!section) return

    if (linearFlow) {
      const pane = index === 0 ? "access" : "application"
      section.querySelector<HTMLElement>(`[data-stage-pane="${pane}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      return
    }

    const bounds = section.getBoundingClientRect()
    const sectionTop = window.scrollY + bounds.top
    const scrollableDistance = Math.max(bounds.height - window.innerHeight, 0)
    const progress = stepCount === 1 ? 0 : index / (stepCount - 1)

    window.scrollTo({
      top: sectionTop + scrollableDistance * progress,
      behavior: "smooth",
    })
  }, [linearFlow, stepCount])

  const releaseFocusLock = (pane: StagePane, event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setFocusedPane((current) => current === pane ? null : current)
    }
  }

  const activeStep = steps[activeIndex] ?? steps[0]
  const guidedView = activeStep?.id === "configure" ? "borrow" : activeStep?.id === "trace" ? "trace" : "markets"
  const applicationContent = application ?? <Application key={guidedView} initialView={guidedView} />
  const showAccess = linearFlow || (focusedPane ? focusedPane === "access" : activeIndex === 0)
  const showApplication = linearFlow || (focusedPane ? focusedPane === "application" : activeIndex > 0)
  const rootClassName = [styles.stage, className].filter(Boolean).join(" ")
  const stageStyle: StageStyle = {
    "--product-stage-progress": "0",
    "--product-stage-steps": stepCount,
  }

  return (
    <section
      ref={sectionRef}
      id="product-stage"
      className={rootClassName}
      style={stageStyle}
      aria-labelledby={headingId}
      data-active-stage={activeStep?.id ?? "access"}
    >
      <div className={styles.canvas}>
        <div className={styles.ambient} aria-hidden="true">
          <span className={styles.grid} />
        </div>

        <div className={styles.frame}>
          <header className={styles.intro}>
            <div>
              <span className={styles.kicker}>PRODUCT STAGE</span>
              <h2 id={headingId}>Position to liquidity in one visible route</h2>
            </div>
            <p>Scroll through the route, then use the product interface directly</p>
          </header>

          <div className={styles.workspace}>
            <nav className={styles.rail} aria-label="Product stage progress">
              <div className={styles.progressTrack} aria-hidden="true">
                <span />
              </div>
              <ol>
                {steps.map((step, index) => (
                  <li key={`${step.id}-${index}`} className={index === activeIndex ? styles.activeStep : undefined}>
                    <button
                      type="button"
                      onClick={() => navigateToStep(index)}
                      aria-current={index === activeIndex ? "step" : undefined}
                      aria-label={`Go to ${step.label} stage`}
                    >
                      <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.stepCopy}>
                        <strong>{step.label}</strong>
                        <small>{step.caption}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            <div className={styles.productViewport}>
              <div className={styles.viewportBody}>
                <div
                  className={`${styles.pane} ${styles.accessPane} ${showAccess ? styles.visiblePane : ""}`}
                  data-stage-pane="access"
                  inert={!showAccess}
                  aria-hidden={!showAccess}
                  onFocusCapture={() => setFocusedPane("access")}
                  onBlurCapture={(event) => releaseFocusLock("access", event)}
                >
                  <div className={styles.paneLabel}>Access</div>
                  {access}
                </div>

                <div
                  className={`${styles.pane} ${styles.applicationPane} ${showApplication ? styles.visiblePane : ""}`}
                  data-stage-pane="application"
                  inert={!showApplication}
                  aria-hidden={!showApplication}
                  onFocusCapture={() => setFocusedPane("application")}
                  onBlurCapture={(event) => releaseFocusLock("application", event)}
                >
                  <div className={styles.paneLabel}>Product interface</div>
                  {applicationContent}
                </div>
              </div>
            </div>
          </div>

          <footer className={styles.stageFooter}>
            <span>SCROLL TO FOLLOW THE ROUTE</span>
            <span>The guided view never submits an application action</span>
          </footer>
        </div>
      </div>
    </section>
  )
}
