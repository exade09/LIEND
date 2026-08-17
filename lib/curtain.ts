// Liquid curtain configuration: droplet instance layout and the depth/timing
// curves that drive the scroll-scrubbed exit. Frozen literals only — no
// Math.random()/Date at module scope, so SSR output matches the client and
// there is no hydration mismatch.

export type DropletId = "a" | "b" | "c" | "d" | "e"
export type Tier = "sm" | "md" | "lg"
export type Depth = "far" | "mid" | "near"

export type DropletInstance = {
  id: DropletId
  tier: Tier
  depth: Depth
  x: number // % of stage width, box centre
  y: number // % of stage height, box centre
  w: number // % of stage width, box width (droplets are square source art)
  rot: number // deg, resting rotation
  flip?: boolean
  travel: number // 0.82 - 1.24, per-instance arrival weight
  drift: number // % lateral wander at the peak of the differential phase
  squash: number // 0 - 0.06, peak squash/stretch amplitude
}

// The full 16-instance desktop field. Tablet and mobile are literal subsets/
// replacements below rather than a CSS-hidden overflow, so hidden instances
// are never fetched or decoded (see LiquidCurtain.tsx).
export const DESKTOP_INSTANCES: readonly DropletInstance[] = [
  // far (background, blurred, slowest to arrive)
  { id: "a", tier: "lg", depth: "far", x: 10, y: 20, w: 58, rot: -6, travel: 0.92, drift: -4, squash: 0.03 },
  { id: "c", tier: "lg", depth: "far", x: 46, y: 8, w: 54, rot: 8, flip: true, travel: 1.05, drift: 3, squash: 0.025 },
  { id: "e", tier: "lg", depth: "far", x: 82, y: 22, w: 60, rot: -9, travel: 0.88, drift: -3, squash: 0.035 },
  { id: "d", tier: "md", depth: "far", x: 64, y: 4, w: 42, rot: 5, travel: 1.1, drift: 5, squash: 0.02 },

  // mid
  { id: "b", tier: "md", depth: "mid", x: 2, y: 46, w: 46, rot: -11, travel: 0.95, drift: -5, squash: 0.04 },
  { id: "d", tier: "md", depth: "mid", x: 26, y: 58, w: 50, rot: 7, flip: true, travel: 1.08, drift: 2, squash: 0.035 },
  { id: "a", tier: "md", depth: "mid", x: 52, y: 40, w: 44, rot: -4, travel: 1.0, drift: -2, squash: 0.03 },
  { id: "e", tier: "lg", depth: "mid", x: 70, y: 54, w: 56, rot: 10, travel: 0.9, drift: 4, squash: 0.045 },
  { id: "c", tier: "md", depth: "mid", x: 92, y: 38, w: 48, rot: -13, travel: 1.15, drift: -6, squash: 0.025 },
  { id: "b", tier: "sm", depth: "mid", x: 38, y: 66, w: 34, rot: 6, flip: true, travel: 1.2, drift: 1, squash: 0.02 },

  // near (foreground, sharpest, first to arrive)
  { id: "d", tier: "lg", depth: "near", x: 14, y: 78, w: 72, rot: -8, travel: 1.0, drift: -3, squash: 0.04 },
  { id: "c", tier: "lg", depth: "near", x: 0, y: 92, w: 64, rot: 12, flip: true, travel: 0.95, drift: 5, squash: 0.035 },
  { id: "e", tier: "md", depth: "near", x: 34, y: 88, w: 50, rot: -6, travel: 1.12, drift: -4, squash: 0.03 },
  { id: "a", tier: "lg", depth: "near", x: 58, y: 82, w: 68, rot: 9, travel: 0.98, drift: 3, squash: 0.045 },
  { id: "b", tier: "md", depth: "near", x: 80, y: 94, w: 52, rot: -10, flip: true, travel: 1.24, drift: -2, squash: 0.025 },
  { id: "d", tier: "sm", depth: "near", x: 98, y: 80, w: 40, rot: 14, travel: 1.05, drift: 6, squash: 0.02 },
]

// Tablet: drop the lightest 4 far/mid instances, keep the full near layer
// (the near layer carries the "liquid floor" the brief calls for at 65-85%).
const DROP_ON_TABLET = new Set([3, 5, 8, 9]) // indices into DESKTOP_INSTANCES: far#4(d/md), mid#6(d/md), mid#9(c/md), mid#10(b/sm)
export const TABLET_INSTANCES: readonly DropletInstance[] = DESKTOP_INSTANCES.filter(
  (_, index) => !DROP_ON_TABLET.has(index),
)

// Mobile: a distinct portrait-tuned layout — bigger relative droplets, not
// more of them, spread down the tall viewport.
export const MOBILE_INSTANCES: readonly DropletInstance[] = [
  { id: "d", tier: "md", depth: "far", x: 30, y: 8, w: 78, rot: 6, travel: 0.9, drift: -3, squash: 0.03 },
  { id: "b", tier: "md", depth: "far", x: 82, y: 14, w: 68, rot: -10, flip: true, travel: 1.05, drift: 3, squash: 0.025 },
  { id: "a", tier: "md", depth: "mid", x: 6, y: 32, w: 72, rot: -6, travel: 1.0, drift: -4, squash: 0.035 },
  { id: "e", tier: "md", depth: "mid", x: 60, y: 40, w: 80, rot: 9, travel: 0.92, drift: 4, squash: 0.04 },
  { id: "c", tier: "sm", depth: "mid", x: 28, y: 54, w: 60, rot: -12, flip: true, travel: 1.15, drift: -2, squash: 0.02 },
  { id: "d", tier: "md", depth: "near", x: 84, y: 62, w: 74, rot: 8, travel: 1.0, drift: 3, squash: 0.04 },
  { id: "b", tier: "md", depth: "near", x: 20, y: 76, w: 82, rot: -8, travel: 1.1, drift: -3, squash: 0.03 },
  { id: "a", tier: "sm", depth: "near", x: 70, y: 88, w: 62, rot: 11, flip: true, travel: 0.95, drift: 5, squash: 0.025 },
  { id: "e", tier: "md", depth: "near", x: 42, y: 96, w: 76, rot: -5, travel: 1.2, drift: -4, squash: 0.02 },
]

export const DEPTH_BLUR_PX: Record<Depth, number> = {
  far: 10,
  mid: 0,
  near: 0,
}

// Piecewise-linear control points for each depth's local progress curve.
// Every curve reaches exactly 1 at global progress p = 1, which is what
// guarantees every droplet fully clears the stage regardless of depth or
// per-instance travel — the differential is in how it gets there, not where
// it ends up. Values are [globalProgress, localProgress] pairs.
export const DEPTH_CURVES: Record<Depth, ReadonlyArray<readonly [number, number]>> = {
  far: [
    [0, 0],
    [0.2, 0.02],
    [0.65, 0.22],
    [0.85, 0.55],
    [1, 1],
  ],
  mid: [
    [0, 0],
    [0.2, 0.05],
    [0.65, 0.42],
    [0.85, 0.8],
    [1, 1],
  ],
  near: [
    [0, 0],
    [0.2, 0.09],
    [0.65, 0.62],
    [0.85, 0.92],
    [1, 1],
  ],
}

export const PLATE_CURVE: ReadonlyArray<readonly [number, number]> = DEPTH_CURVES.mid

// Fraction of the hero's total scrollable distance (story height - stage
// height) that the curtain occupies. Kept as a single named constant so the
// hook and Hero.module.css agree on where the curtain ends and the existing
// hero motion resumes. 130svh of curtain travel within a 245svh scrollable
// distance (345svh story - 100svh pinned stage).
export const CURTAIN_SCROLL_FRACTION = 130 / 245
