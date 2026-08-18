"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import {
  DEPTH_BLUR_PX,
  DESKTOP_INSTANCES,
  MOBILE_INSTANCES,
  TABLET_INSTANCES,
  type DropletInstance,
} from "@/lib/curtain"
import { useCurtainProgress, type CurtainDropletHandle } from "@/lib/useCurtainProgress"

import styles from "./LiquidCurtain.module.css"

type Breakpoint = "mobile" | "tablet" | "desktop"

const DEPTHS = ["far", "mid", "near"] as const

function resolveBreakpoint(): Breakpoint {
  if (window.matchMedia("(min-width: 1025px)").matches) return "desktop"
  if (window.matchMedia("(min-width: 641px)").matches) return "tablet"
  return "mobile"
}

function instancesFor(breakpoint: Breakpoint): readonly DropletInstance[] {
  if (breakpoint === "desktop") return DESKTOP_INSTANCES
  if (breakpoint === "tablet") return TABLET_INSTANCES
  return MOBILE_INSTANCES
}

type LiquidCurtainProps = {
  storyRef: React.RefObject<HTMLElement | null>
  stageRef: React.RefObject<HTMLElement | null>
}

export function LiquidCurtain({ storyRef, stageRef }: LiquidCurtainProps) {
  // SSR / first paint renders the mobile-safe set (largest relative droplet
  // scale, guarantees coverage on any width) so there is never an uncovered
  // frame before JS measures the real viewport.
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("mobile")

  useEffect(() => {
    const updateBreakpoint = () => setBreakpoint(resolveBreakpoint())
    updateBreakpoint()

    const desktopQuery = window.matchMedia("(min-width: 1025px)")
    const tabletQuery = window.matchMedia("(min-width: 641px)")
    desktopQuery.addEventListener("change", updateBreakpoint)
    tabletQuery.addEventListener("change", updateBreakpoint)

    return () => {
      desktopQuery.removeEventListener("change", updateBreakpoint)
      tabletQuery.removeEventListener("change", updateBreakpoint)
    }
  }, [])

  const instances = instancesFor(breakpoint)

  // A fresh collection array per breakpoint's instance set — ref callbacks
  // populate it during commit (not render), so no ref is read or written
  // synchronously in the render body.
  const droplets = useMemo(() => new Array(instances.length) as CurtainDropletHandle[], [instances])

  useCurtainProgress({ storyRef, stageRef, droplets })

  return (
    <div className={styles.root} aria-hidden="true" data-breakpoint={breakpoint}>
      {DEPTHS.map((depth) => (
        <div
          key={depth}
          className={styles.layer}
          data-depth={depth}
          style={DEPTH_BLUR_PX[depth] > 0 ? { filter: `blur(${DEPTH_BLUR_PX[depth]}px)` } : undefined}
        >
          {instances.map((inst, index) => {
            if (inst.depth !== depth) return null
            const isLargeNear = depth === "near" && inst.w >= 60

            return (
              <div
                key={`${breakpoint}-${index}`}
                className={styles.dropletBox}
                style={{
                  left: `${inst.x}%`,
                  top: `${inst.y}%`,
                  width: `${inst.w}%`,
                  transform: `translate(-50%, -50%)${inst.flip ? " scaleX(-1)" : ""}`,
                }}
              >
                <div
                  ref={(el) => {
                    if (el) {
                      droplets[index] = {
                        el,
                        depth: inst.depth,
                        rot: inst.rot,
                        drift: inst.drift,
                        travel: inst.travel,
                        squash: inst.squash,
                      }
                    }
                  }}
                  className={styles.dropletMotion}
                  style={
                    {
                      "--ty": "0px",
                      "--tx": "0%",
                      "--rot": `${inst.rot}deg`,
                      "--sx": 1,
                      "--sy": 1,
                    } as React.CSSProperties
                  }
                >
                  <Image
                    src={`/assets/curtain/pixel/droplet-${inst.id}-${inst.tier}.png`}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 45vw, 30vw"
                    priority={isLargeNear}
                    fetchPriority={isLargeNear ? "high" : "auto"}
                    loading={isLargeNear ? "eager" : "lazy"}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
