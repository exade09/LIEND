// Pixelate the five source droplets for the liquid curtain.
// Original photoreal webps in public/assets/curtain/ are left untouched.
// Run: node scripts/pixelate-droplets.mjs

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const sourceDir = path.join(root, "Liend-Larp-Assets")
const outDir = path.join(root, "public", "assets", "curtain", "pixel")

const droplets = {
  a: "5c36d4b5-d036-478f-bd58-71f924b26276.png",
  b: "62c958b8-bf70-4041-ab98-3ecf27bab304.png",
  c: "7c01301d-f7a3-4c24-8939-1e88a2ec0c20.png",
  d: "cb667d30-4b30-42e6-bb3d-a9558d662e58.png",
  e: "e5bc3012-c74d-403a-a19e-bc388b3b38c4.png",
}

// Fine enough to keep a teardrop silhouette, coarse enough to stay readable.
const grids = { sm: 36, md: 48, lg: 60 }

const PALETTE = {
  empty: [0, 0, 0, 0],
  outline: [24, 22, 78, 255],
  purple: [118, 62, 214, 255],
  blue: [52, 92, 236, 255],
  cyan: [72, 214, 248, 255],
  highlight: [236, 248, 255, 255],
}

function setPixel(data, i, color) {
  data[i] = color[0]
  data[i + 1] = color[1]
  data[i + 2] = color[2]
  data[i + 3] = color[3]
}

function isSolid(data, i) {
  return data[i + 3] > 0
}

function fillColor(r, g, b) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (luma > 188) return PALETTE.highlight
  if (g > 140 || (b > 170 && g > 110)) return PALETTE.cyan
  if (r > 70 && r + 20 > g) return PALETTE.purple
  if (luma < 78) return PALETTE.purple
  return PALETTE.blue
}

function neighbors(x, y, w, h) {
  const out = []
  if (x > 0) out.push([x - 1, y])
  if (x + 1 < w) out.push([x + 1, y])
  if (y > 0) out.push([x, y - 1])
  if (y + 1 < h) out.push([x, y + 1])
  return out
}

function idx(x, y, w) {
  return (y * w + x) * 4
}

function removeSpeckles(data, w, h) {
  const next = Buffer.from(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (!isSolid(data, i)) continue
      const n = neighbors(x, y, w, h)
      const solid = n.filter(([nx, ny]) => isSolid(data, idx(nx, ny, w))).length
      if (solid <= 1) setPixel(next, i, PALETTE.empty)
    }
  }
  next.copy(data)
}

function paintOutline(data, w, h) {
  const next = Buffer.from(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (!isSolid(data, i)) continue
      const edge = neighbors(x, y, w, h).some(([nx, ny]) => !isSolid(data, idx(nx, ny, w)))
      if (edge) setPixel(next, i, PALETTE.outline)
    }
  }
  next.copy(data)
}

async function pixelate(srcPath, grid, outPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .resize(grid * 3, grid * 3, {
      fit: "contain",
      kernel: "cubic",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .blur(1.15)
    .resize(grid, grid, {
      fit: "contain",
      kernel: "nearest",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 96 || r + g + b < 28) {
      setPixel(data, i, PALETTE.empty)
      continue
    }
    setPixel(data, i, fillColor(r, g, b))
  }

  removeSpeckles(data, w, h)
  paintOutline(data, w, h)

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  for (const [id, file] of Object.entries(droplets)) {
    const srcPath = path.join(sourceDir, file)
    for (const [tier, grid] of Object.entries(grids)) {
      const out = path.join(outDir, `droplet-${id}-${tier}.png`)
      await pixelate(srcPath, grid, out)
      console.log(`pixel ${id} ${tier} ${grid}px -> ${path.relative(root, out)}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
