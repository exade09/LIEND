"use client"

import { type ReactNode } from "react"
import { DeskClock } from "@/components/DeskClock"
import { HolderGate } from "@/components/HolderGate"
import styles from "./ProductStage.module.css"

type ProductStageProps = {
  access?: ReactNode
  className?: string
}

export default function ProductStage({
  access = <HolderGate />,
  className,
}: ProductStageProps) {
  const rootClassName = [styles.stage, className].filter(Boolean).join(" ")

  return (
    <section
      id="product-stage"
      className={rootClassName}
      aria-label="Access gate"
    >
      <div className={styles.canvas}>
        <div className={styles.set}>
          <div className={styles.frame}>
            <img
              className={styles.bezel}
              src="/assets/webcore-desk-crt.png"
              alt=""
              draggable={false}
            />
            <div className={styles.monitor}>
              <div className={styles.screen}>
                <div className={styles.scanlines} aria-hidden="true" />
                <div className={styles.screenGlare} aria-hidden="true" />

                <div className={styles.workspace}>
                  <div className={styles.productViewport}>
                    <div className={styles.viewportBody}>
                      <div className={`${styles.pane} ${styles.visiblePane}`} data-stage-pane="access">
                        {access}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <img
                className={styles.monitorBezel}
                src="/assets/webcore-desk-crt.png"
                alt=""
                draggable={false}
              />
            </div>
            <DeskClock />
          </div>
        </div>
      </div>
    </section>
  )
}
