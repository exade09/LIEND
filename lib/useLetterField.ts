"use client"

import { useEffect, useRef } from "react"

type SpringState = {
  dx: number
  dy: number
  rot: number
  sx: number
  sy: number
  vdx: number
  vdy: number
  vrot: number
  vsx: number
  vsy: number
}

type LetterTarget = {
  el: HTMLElement
  cx: number
  cy: number
  spring: SpringState
  target: { dx: number; dy: number; rot: number; sx: number; sy: number }
}

// Discrete leaky-integrator spring: v += (target - x) * STIFFNESS; v *= DAMPING; x += v.
// Its characteristic matrix has det = DAMPING and trace = 1 + DAMPING*(1 - STIFFNESS),
// so eigenvalues are complex (i.e. the spring overshoots and rings) whenever
// (1 + DAMPING*(1-STIFFNESS))^2 < 4*DAMPING. These values sit just outside that
// region — a quick, confident settle with no overshoot, which reads as soft
// rather than bouncy. (0.14/0.78 does overshoot; kept here as a landmine to avoid.)
const STIFFNESS = 0.14
const DAMPING = 0.5
const SETTLE_EPSILON = 0.01

const MAX_DX = 9
const MAX_DY = 7
const MAX_ROT = 1.6
const MAX_SCALE = 0.035
const MAX_SQUASH = 0.045
// Tight enough that hovering one letter doesn't visibly move its neighbor two
// letters over — roughly 1.5-2x a single letter's own width.
const RADIUS_RATIO = 0.32

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function createSpring(): SpringState {
  return { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, vdx: 0, vdy: 0, vrot: 0, vsx: 0, vsy: 0 }
}

function step(current: number, velocityKey: keyof SpringState, spring: SpringState, target: number) {
  const velocity = spring[velocityKey] + (target - current) * STIFFNESS
  const dampened = velocity * DAMPING
  return { value: current + dampened, velocity: dampened }
}

export function useLetterField(containerRef: React.RefObject<HTMLElement | null>) {
  const lettersRef = useRef<LetterTarget[]>([])
  const rafRef = useRef<number | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const radiusRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return

    const letterEls = Array.from(container.querySelectorAll<HTMLElement>("[data-letter]"))
    if (letterEls.length === 0) return

    const measure = () => {
      const bounds = container.getBoundingClientRect()
      radiusRef.current = bounds.width * RADIUS_RATIO

      lettersRef.current = letterEls.map((el) => {
        const box = el.getBoundingClientRect()
        const existing = lettersRef.current.find((l) => l.el === el)
        return {
          el,
          cx: box.left - bounds.left + box.width / 2,
          cy: box.top - bounds.top + box.height / 2,
          spring: existing?.spring ?? createSpring(),
          target: existing?.target ?? { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 },
        }
      })
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(container)

    const ensureLoop = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(tick)
    }

    const tick = () => {
      rafRef.current = null
      let anyMoving = false

      for (const letter of lettersRef.current) {
        const { spring, target, el } = letter

        const dx = step(spring.dx, "vdx", spring, target.dx)
        const dy = step(spring.dy, "vdy", spring, target.dy)
        const rot = step(spring.rot, "vrot", spring, target.rot)
        const sx = step(spring.sx, "vsx", spring, target.sx)
        const sy = step(spring.sy, "vsy", spring, target.sy)

        spring.dx = dx.value
        spring.vdx = dx.velocity
        spring.dy = dy.value
        spring.vdy = dy.velocity
        spring.rot = rot.value
        spring.vrot = rot.velocity
        spring.sx = sx.value
        spring.vsx = sx.velocity
        spring.sy = sy.value
        spring.vsy = sy.velocity

        const settled =
          Math.abs(spring.dx - target.dx) < SETTLE_EPSILON &&
          Math.abs(spring.dy - target.dy) < SETTLE_EPSILON &&
          Math.abs(spring.rot - target.rot) < SETTLE_EPSILON &&
          Math.abs(spring.sx - target.sx) < SETTLE_EPSILON &&
          Math.abs(spring.sy - target.sy) < SETTLE_EPSILON &&
          Math.abs(spring.vdx) < SETTLE_EPSILON &&
          Math.abs(spring.vdy) < SETTLE_EPSILON

        if (settled && target.dx === 0 && target.dy === 0 && target.rot === 0 && target.sx === 1 && target.sy === 1) {
          spring.dx = 0
          spring.dy = 0
          spring.rot = 0
          spring.sx = 1
          spring.sy = 1
          el.style.removeProperty("--dx")
          el.style.removeProperty("--dy")
          el.style.removeProperty("--rot")
          el.style.removeProperty("--sx")
          el.style.removeProperty("--sy")
        } else {
          anyMoving = true
          el.style.setProperty("--dx", `${spring.dx.toFixed(3)}px`)
          el.style.setProperty("--dy", `${spring.dy.toFixed(3)}px`)
          el.style.setProperty("--rot", `${spring.rot.toFixed(3)}deg`)
          el.style.setProperty("--sx", spring.sx.toFixed(4))
          el.style.setProperty("--sy", spring.sy.toFixed(4))
        }
      }

      if (anyMoving) {
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }

    const updateTargets = (px: number, py: number) => {
      const radius = radiusRef.current || 1
      for (const letter of lettersRef.current) {
        const distX = letter.cx - px
        const distY = letter.cy - py
        const dist = Math.hypot(distX, distY)
        const raw = Math.max(0, Math.min(1, 1 - dist / radius))
        const falloff = smoothstep(raw)

        if (falloff <= 0) {
          letter.target.dx = 0
          letter.target.dy = 0
          letter.target.rot = 0
          letter.target.sx = 1
          letter.target.sy = 1
          continue
        }

        const ux = dist > 0.001 ? distX / dist : 0
        const uy = dist > 0.001 ? distY / dist : 0

        letter.target.dx = ux * MAX_DX * falloff
        letter.target.dy = uy * MAX_DY * falloff
        letter.target.rot = ux * MAX_ROT * falloff
        const baseScale = 1 + MAX_SCALE * falloff
        const squash = MAX_SQUASH * falloff * ux
        letter.target.sx = baseScale + squash
        letter.target.sy = baseScale - squash * 0.66
      }
      ensureLoop()
    }

    const clearTargets = () => {
      for (const letter of lettersRef.current) {
        letter.target.dx = 0
        letter.target.dy = 0
        letter.target.rot = 0
        letter.target.sx = 1
        letter.target.sy = 1
      }
      ensureLoop()
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const bounds = container.getBoundingClientRect()
      pointerRef.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      updateTargets(pointerRef.current.x, pointerRef.current.y)
    }

    const handlePointerLeave = () => {
      clearTargets()
    }

    container.addEventListener("pointermove", handlePointerMove, { passive: true })
    container.addEventListener("pointerleave", handlePointerLeave, { passive: true })
    window.addEventListener("resize", measure)

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerleave", handlePointerLeave)
      window.removeEventListener("resize", measure)
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      for (const letter of lettersRef.current) {
        letter.el.style.removeProperty("--dx")
        letter.el.style.removeProperty("--dy")
        letter.el.style.removeProperty("--rot")
        letter.el.style.removeProperty("--sx")
        letter.el.style.removeProperty("--sy")
      }
    }
  }, [containerRef])
}
