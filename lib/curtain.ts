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

function cell(
  id: DropletId,
  tier: Tier,
  depth: Depth,
  x: number,
  y: number,
  w: number,
  extra?: { flip?: boolean },
): DropletInstance {
  return { id, tier, depth, x, y, w, rot: 0, drift: 0, squash: 0, travel: 1, ...extra }
}

// Dense overlapping field so the pixel teardrops (which leave transparent
// corners in their square boxes) still fully cover the stage at rest.
// Fall is straight down: rot/drift/squash stay 0.
export const DESKTOP_INSTANCES: readonly DropletInstance[] = [
  cell("a", "lg", "far", 8, 8, 80),
  cell("c", "lg", "far", 40, 0, 78, { flip: true }),
  cell("e", "lg", "far", 74, 10, 82),
  cell("d", "lg", "far", 100, 4, 76, { flip: true }),
  cell("b", "md", "far", 24, 26, 68),
  cell("a", "md", "far", 58, 22, 66, { flip: true }),

  cell("b", "lg", "mid", 0, 44, 78, { flip: true }),
  cell("d", "lg", "mid", 26, 50, 80),
  cell("a", "lg", "mid", 52, 42, 76, { flip: true }),
  cell("e", "lg", "mid", 78, 48, 80),
  cell("c", "lg", "mid", 100, 38, 74),
  cell("b", "md", "mid", 14, 64, 64, { flip: true }),
  cell("d", "md", "mid", 44, 62, 62),
  cell("a", "md", "mid", 88, 66, 64, { flip: true }),

  cell("d", "lg", "near", 6, 80, 86),
  cell("c", "lg", "near", 34, 88, 84, { flip: true }),
  cell("a", "lg", "near", 62, 78, 86),
  cell("e", "lg", "near", 90, 86, 82, { flip: true }),
  cell("b", "lg", "near", 0, 98, 80),
  cell("d", "md", "near", 22, 72, 66, { flip: true }),
  cell("e", "md", "near", 50, 98, 70),
  cell("c", "md", "near", 76, 70, 64),
]

const DROP_ON_TABLET = new Set([4, 5, 11, 13, 19])
export const TABLET_INSTANCES: readonly DropletInstance[] = DESKTOP_INSTANCES.filter(
  (_, index) => !DROP_ON_TABLET.has(index),
)

export const MOBILE_INSTANCES: readonly DropletInstance[] = [
  cell("d", "lg", "far", 18, 4, 92),
  cell("b", "lg", "far", 82, 10, 90, { flip: true }),
  cell("a", "lg", "mid", 4, 30, 88),
  cell("e", "lg", "mid", 58, 36, 94, { flip: true }),
  cell("c", "lg", "mid", 28, 52, 86),
  cell("d", "lg", "near", 86, 58, 90, { flip: true }),
  cell("b", "lg", "near", 12, 74, 94),
  cell("a", "lg", "near", 64, 82, 90, { flip: true }),
  cell("e", "lg", "near", 36, 96, 92),
  cell("c", "md", "near", 96, 40, 78),
]

export const DEPTH_BLUR_PX: Record<Depth, number> = {
  far: 0,
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
