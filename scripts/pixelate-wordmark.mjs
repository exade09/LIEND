// Pixelate the LIEND wordmark while keeping the liquid letterforms.
// Original webps in public/assets/wordmark/ are left untouched.
// Run: node scripts/pixelate-wordmark.mjs

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcPath = path.join(root, "Liend-Larp-Assets", "Liend-Text.png")
const outDir = path.join(root, "public", "assets", "wordmark", "pixel")

// Same percentages as lib/wordmark.ts — crops stay aligned with the hero layout.
const LETTER_BOXES = [
  { letter: "l", left: 5.8011, top: 14.0884, width: 19.5672, height: 71.547 },
  { letter: "i", left: 26.3812, top: 13.9503, width: 8.1492, height: 73.2044 },
  { letter: "e", left: 35.7274, top: 13.5359, width: 18.4162, height: 73.3425 },
  { letter: "n", left: 55.2026, top: 14.779, width: 21.7311, height: 71.8232 },
  { letter: "d", left: 77.5783, top: 14.2265, width: 19.291, height: 71.9613 },
]

const GRID_WIDTH = 362
const GRID_HEIGHT = 121

const PALETTE = [
  [22, 18, 64],
  [56, 32, 140],
  [118, 54, 214],
  [176, 112, 252],
  [48, 56, 196],
  [58, 96, 236],
  [64, 168, 246],
  [56, 214, 242],
  [140, 240, 255],
  [232, 250, 255],
  [255, 255, 255],
]

function nearestColor(r, g, b) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (luma > 226) return PALETTE[PALETTE.length - 1]
  if (luma > 198) return PALETTE[PALETTE.length - 2]

  let best = PALETTE[0]
  let bestDist = Infinity
  for (const color of PALETTE) {
    const dr = r - color[0]
    const dg = g - color[1]
    const db = b - color[2]
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = color
    }
  }
  return best
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .resize(GRID_WIDTH * 2, GRID_HEIGHT * 2, {
      fit: "fill",
      kernel: "lanczos3",
    })
    .resize(GRID_WIDTH, GRID_HEIGHT, {
      fit: "fill",
      kernel: "nearest",
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 50 || r + g + b < 24) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
      continue
    }
    const color = nearestColor(r, g, b)
    data[i] = color[0]
    data[i + 1] = color[1]
    data[i + 2] = color[2]
    data[i + 3] = 255
  }

  const pixelated = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })

  await pixelated
    .clone()
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, "liend-full.png"))

  for (const box of LETTER_BOXES) {
    const left = clamp(Math.round((box.left / 100) * info.width), 0, info.width - 1)
    const top = clamp(Math.round((box.top / 100) * info.height), 0, info.height - 1)
    const width = clamp(Math.round((box.width / 100) * info.width), 1, info.width - left)
    const height = clamp(Math.round((box.height / 100) * info.height), 1, info.height - top)
    const out = path.join(outDir, `liend-${box.letter}.png`)
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left, top, width, height })
      .png({ compressionLevel: 9 })
      .toFile(out)
    console.log(`letter ${box.letter} ${width}x${height} -> ${path.relative(root, out)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
