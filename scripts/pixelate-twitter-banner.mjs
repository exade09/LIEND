// Pixel Twitter banner from the liquid LIEND lockup.
// Output: 1500x500 (Twitter header), nearest-neighbor from a 300x100 grid.
// Run: node scripts/pixelate-twitter-banner.mjs

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcPath = path.join(root, "tmp", "logo-pixel", "banner-source.png")
const publicDir = path.join(root, "public", "assets")
const pixelDir = path.join(publicDir, "logo", "pixel")

const GRID_W = 300
const GRID_H = 100
const SCALE = 5

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

const BASE = [8, 9, 18]
const PURPLE_RAMP = [
  [8, 9, 18],
  [18, 14, 40],
  [30, 20, 64],
  [44, 28, 92],
  [58, 38, 118],
]
const CYAN_RAMP = [
  [8, 9, 18],
  [12, 20, 40],
  [16, 36, 64],
  [22, 52, 88],
  [28, 72, 108],
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
    const dist = dr * dr * 0.9 + dg * dg + db * db * 1.15
    if (dist < bestDist) {
      bestDist = dist
      best = color
    }
  }
  return best
}

function idx(x, y, w) {
  return (y * w + x) * 4
}

function setPixel(data, i, color) {
  data[i] = color[0]
  data[i + 1] = color[1]
  data[i + 2] = color[2]
  data[i + 3] = 255
}

function fieldPixel(x, y, w, h) {
  const cx = (w - 1) / 2
  const cy = h * 0.5
  const nx = (x - cx) / (w * 0.42)
  const ny = (y - cy) / (h * 0.58)
  const dist = Math.sqrt(nx * nx + ny * ny)
  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]
  const dither = bayer[y % 4][x % 4] / 16
  const falloff = Math.max(0, 1 - dist)
  const level = Math.max(0, Math.min(4, Math.floor(Math.pow(falloff, 0.8) * 3.8 + dither * 0.7)))
  const ramp = x >= cx ? CYAN_RAMP : PURPLE_RAMP
  return ramp[level] ?? BASE
}

async function main() {
  await mkdir(pixelDir, { recursive: true })

  const hi = await sharp(srcPath)
    .ensureAlpha()
    .resize(GRID_W * 3, GRID_H * 3, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer()

  const { data, info } = await sharp(hi)
    .resize(GRID_W, GRID_H, { fit: "fill", kernel: "nearest" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const out = Buffer.alloc(w * h * 4)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (luma < 20) {
        setPixel(out, i, fieldPixel(x, y, w, h))
        continue
      }
      const [nr, ng, nb] = nearestColor(r, g, b)
      setPixel(out, i, [nr, ng, nb])
    }
  }

  const native = path.join(pixelDir, "liend-twitter-native.png")
  const banner = path.join(publicDir, "liend-twitter-banner.png")
  const preview = path.join(root, "tmp", "logo-pixel", "twitter-banner-preview.png")

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(native)

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize(GRID_W * SCALE, GRID_H * SCALE, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toFile(banner)

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize(GRID_W * 4, GRID_H * 4, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toFile(preview)

  console.log(`native ${w}x${h} -> ${path.relative(root, native)}`)
  console.log(`twitter ${GRID_W * SCALE}x${GRID_H * SCALE} -> ${path.relative(root, banner)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
