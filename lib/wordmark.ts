// Exact letter geometry measured from Liend-Larp-Assets/Liend-Text.png
// (2172x724) by scripts/prepare-assets.mjs at alpha > 25. Percentages are of
// the full wordmark canvas, so a container with the same aspect-ratio
// (2172 / 724) reassembles the five crops pixel-aligned with the source.
export type LetterId = "l" | "i" | "e" | "n" | "d"

export type LetterBox = {
  letter: LetterId
  left: number
  top: number
  width: number
  height: number
}

export const WORDMARK_ASPECT_RATIO = "2172 / 724"

export const LETTER_BOXES: readonly LetterBox[] = [
  { letter: "l", left: 5.8011, top: 14.0884, width: 19.5672, height: 71.547 },
  { letter: "i", left: 26.3812, top: 13.9503, width: 8.1492, height: 73.2044 },
  { letter: "e", left: 35.7274, top: 13.5359, width: 18.4162, height: 73.3425 },
  { letter: "n", left: 55.2026, top: 14.779, width: 21.7311, height: 71.8232 },
  { letter: "d", left: 77.5783, top: 14.2265, width: 19.291, height: 71.9613 },
]
