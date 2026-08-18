"use client"

import { useEffect, useRef } from "react"

import { DEPTH_CURVES, CURTAIN_SCROLL_FRACTION, type Depth } from "@/lib/curtain"

function smoothstep(t: number) {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

function interpolateCurve(points: ReadonlyArray<readonly [number, number]>, p: number) {
  if (p <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [gp, lp] = points[i]
    if (p <= gp) {
      const [prevGp, prevLp] = points[i - 1]
      const span = gp - prevGp || 1
      const eased = smoothstep((p - prevGp) / span)
      return prevLp + (lp - prevLp) * eased
    }
  }
  return points[points.length - 1][1]
}

// Keyed to each instance's own local progress (not global scroll progress),
// so squash correlates with how fast that specific droplet is actually
// moving rather than firing in lockstep across every layer. A far-layer
// droplet barely underway at global p=0.3 won't visibly deform yet; it
// squashes later, when its own journey reaches that point.
function squashAmplitude(local: number) {
  if (local <= 0.3) return smoothstep(local / 0.3)
  if (local <= 0.8) return 1 - smoothstep((local - 0.3) / 0.5)
  return 0
}

export type CurtainDropletHandle = {
  el: HTMLElement
  depth: Depth
  rot: number
  drift: number
  travel: number
  squash: number
}

type Options = {
  storyRef: React.RefObject<HTMLElement | null>
  stageRef: React.RefObject<HTMLElement | null>
  droplets: CurtainDropletHandle[]
}

const CLEAR_MARGIN_PX = 24

export function useCurtainProgress({ storyRef, stageRef, droplets }: Options) {
  const clearDistanceRef = useRef<number[]>([])
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const story = storyRef.current
    const stage = stageRef.current
    if (!story || !stage) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    // Hero.module.css un-pins .stage below this height (there is no longer a
    // sticky viewport for scroll progress to scrub against), so the curtain
    // sits this case out the same way it sits out reduced motion.
    const shortViewport = window.matchMedia("(max-height: 720px)")
    if (reducedMotion.matches || shortViewport.matches) return

    const measure = () => {
      const stageRect = stage.getBoundingClientRect()
      clearDistanceRef.current = droplets.map((handle) => {
        const box = handle.el.getBoundingClientRect()
        return Math.max(1, stageRect.bottom - box.top + CLEAR_MARGIN_PX)
      })
    }

    measure()

    const render = () => {
      frameRef.current = null

      const storyRect = story.getBoundingClientRect()
      const stageHeight = stage.getBoundingClientRect().height
      const scrollableDistance = Math.max(storyRect.height - stageHeight, 1)
      const heroProgress = Math.min(1, Math.max(0, -storyRect.top / scrollableDistance))
      const p = Math.min(1, Math.max(0, heroProgress / CURTAIN_SCROLL_FRACTION))

      droplets.forEach((handle, index) => {
        const local = interpolateCurve(DEPTH_CURVES[handle.depth], p)
        const effectiveLocal = 1 - Math.pow(1 - local, handle.travel)
        const clearDistance = clearDistanceRef.current[index] ?? 0
        const ty = effectiveLocal * clearDistance

        const driftFactor = Math.sin(Math.PI * Math.min(1, Math.max(0, local)))
        const tx = handle.drift * driftFactor
        const rotSign = handle.drift >= 0 ? 1 : -1
        const rotWobble = handle.drift === 0 ? 0 : 5 * driftFactor * rotSign
        const rot = handle.rot + rotWobble

        const squash = handle.squash * squashAmplitude(local)
        const sx = 1 + squash
        const sy = 1 - squash * 0.66

        const style = handle.el.style
        style.setProperty("--ty", `${ty.toFixed(2)}px`)
        style.setProperty("--tx", `${tx.toFixed(3)}%`)
        style.setProperty("--rot", `${rot.toFixed(3)}deg`)
        style.setProperty("--sx", sx.toFixed(4))
        style.setProperty("--sy", sy.toFixed(4))
      })

    }

    const requestRender = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(render)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      measure()
      requestRender()
    })
    resizeObserver.observe(stage)

    render()
    window.addEventListener("scroll", requestRender, { passive: true })
    window.addEventListener("resize", requestRender)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("scroll", requestRender)
      window.removeEventListener("resize", requestRender)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [storyRef, stageRef, droplets])
}
