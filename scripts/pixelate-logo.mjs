// Pixelate the LIEND mark into a real low-res logo, not a filtered photo.
// Source stays in tmp/. Previews are upscaled with nearest-neighbor.
// Run: node scripts/pixelate-logo.mjs

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcPath = path.join(root, "tmp", "logo-pixel", "source.png")
const outDir = path.join(root, "tmp", "logo-pixel")

const GRIDS = [32, 48, 64]
const PREVIEW_SCALE = 12

const PALETTE = [
  [28, 22, 78],
  [72, 36, 168],
  [132, 58, 232],
  [186, 118, 255],
  [46, 62, 210],
  [52, 118, 242],
  [48, 196, 248],
  [120, 236, 255],
  [232, 250, 255],
  [255, 255, 255],
]

const EMPTY = [0, 0, 0, 0]
const OUTLINE = [24, 20, 72, 255]

function nearestColor(r, g, b) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (luma > 228) return PALETTE[PALETTE.length - 1]
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
  data[i + 3] = color[3] ?? 255
}

function isSolid(data, i) {
  return data[i + 3] > 0
}

function neighbors(x, y, w, h) {
  const out = []
  if (x > 0) out.push([x - 1, y])
  if (x + 1 < w) out.push([x + 1, y])
  if (y > 0) out.push([x, y - 1])
  if (y + 1 < h) out.push([x, y + 1])
  return out
}

function removeSpeckles(data, w, h) {
  const next = Buffer.from(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (!isSolid(data, i)) continue
      const solid = neighbors(x, y, w, h).filter(([nx, ny]) => isSolid(data, idx(nx, ny, w))).length
      if (solid <= 1) setPixel(next, i, EMPTY)
    }
  }
  next.copy(data)
}

function fillTinyHoles(data, w, h) {
  const next = Buffer.from(data)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y, w)
      if (isSolid(data, i)) continue
      const n = neighbors(x, y, w, h)
      const solid = n.filter(([nx, ny]) => isSolid(data, idx(nx, ny, w)))
      if (solid.length < 3) continue
      // Do not close the central void: skip empties that sit in the lower-middle well.
      const inWell = x > w * 0.32 && x < w * 0.68 && y > h * 0.42 && y < h * 0.82
      if (inWell) continue
      const sample = idx(solid[0][0], solid[0][1], w)
      setPixel(next, i, [data[sample], data[sample + 1], data[sample + 2], 255])
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
      if (edge) setPixel(next, i, OUTLINE)
    }
  }
  next.copy(data)
}

async function croppedSquareBuffer() {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = idx(x, y, info.width)
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      if (luma < 22) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.08)
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  const width = Math.min(info.width - left, maxX - minX + 1 + pad * 2)
  const height = Math.min(info.height - top, maxY - minY + 1 + pad * 2)
  const size = Math.max(width, height)
  const extraX = Math.floor((size - width) / 2)
  const extraY = Math.floor((size - height) / 2)
  return sharp(srcPath)
    .extract({ left, top, width, height })
    .extend({
      top: extraY,
      bottom: size - height - extraY,
      left: extraX,
      right: size - width - extraX,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer()
}

async function pixelate(grid) {
  const square = await croppedSquareBuffer()
  const big = await sharp(square)
    .resize(grid * 4, grid * 4, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer()
  const { data, info } = await sharp(big)
    .ensureAlpha()
    .resize(grid, grid, { fit: "fill", kernel: "nearest" })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (luma < 18) {
      setPixel(data, i, EMPTY)
      continue
    }
    const [nr, ng, nb] = nearestColor(r, g, b)
    setPixel(data, i, [nr, ng, nb, 255])
  }

  removeSpeckles(data, w, h)
  fillTinyHoles(data, w, h)
  if (grid >= 48) paintOutline(data, w, h)

  const nativePath = path.join(outDir, `logo-${grid}.png`)
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(nativePath)

  const previewPath = path.join(outDir, `logo-${grid}-preview.png`)
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .resize(w * PREVIEW_SCALE, h * PREVIEW_SCALE, { kernel: "nearest" })
    .flatten({ background: { r: 5, g: 6, b: 15 } })
    .png({ compressionLevel: 9 })
    .toFile(previewPath)

  console.log(`${grid}px -> ${path.relative(root, nativePath)}`)
  return { data: Buffer.from(data), width: w, height: h }
}

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

function fieldPixel(x, y, w, h) {
  const cx = (w - 1) / 2
  const cy = h * 0.5
  const nx = (x - cx) / (w * 0.5)
  const ny = (y - cy) / (h * 0.52)
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

function paintField(w, h) {
  const data = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fieldPixel(x, y, w, h)
      setPixel(data, idx(x, y, w), [r, g, b, 255])
    }
  }
  return data
}

function stamp(dest, dw, dh, src, sw, sh, ox, oy) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = idx(x, y, sw)
      if (src[si + 3] < 16) continue
      const dx = x + ox
      const dy = y + oy
      if (dx < 0 || dy < 0 || dx >= dw || dy >= dh) continue
      setPixel(dest, idx(dx, dy, dw), [src[si], src[si + 1], src[si + 2], 255])
    }
  }
}

async function writePng(data, width, height, file, scale = 1) {
  let image = sharp(data, { raw: { width, height, channels: 4 } })
  if (scale > 1) image = image.resize(width * scale, height * scale, { kernel: "nearest" })
  await image.png({ compressionLevel: 9 }).toFile(file)
}

async function writeSocial() {
  const publicDir = path.join(root, "public", "assets", "logo", "pixel")
  await mkdir(publicDir, { recursive: true })

  const mark48 = await pixelate(48)
  const tile = 64
  const icon = paintField(tile, tile)
  stamp(icon, tile, tile, mark48.data, 48, 48, 8, 8)

  const markPath = path.join(publicDir, "liend-mark.png")
  const previewPath = path.join(outDir, "logo-mark-preview.png")
  const icon512 = path.join(publicDir, "liend-icon-512.png")
  const iconPublic = path.join(root, "public", "assets", "liend-icon.png")

  await writePng(icon, tile, tile, markPath)
  await writePng(icon, tile, tile, previewPath, 12)
  await writePng(icon, tile, tile, icon512, 8)
  await writePng(icon, tile, tile, iconPublic, 8)
  await writePng(icon, tile, tile, path.join(root, "app", "icon.png"), 4)

  const cardW = 120
  const cardH = 63
  const card = paintField(cardW, cardH)
  stamp(
    card,
    cardW,
    cardH,
    mark48.data,
    mark48.width,
    mark48.height,
    Math.round((cardW - 48) / 2),
    Math.round((cardH - 48) / 2),
  )
  const cardPath = path.join(publicDir, "liend-card.png")
  const cardPublic = path.join(root, "public", "assets", "liend-card.png")
  await writePng(card, cardW, cardH, cardPath, 10)
  await writePng(card, cardW, cardH, cardPublic, 10)

  console.log(`mark -> ${path.relative(root, markPath)}`)
  console.log(`card -> ${path.relative(root, cardPath)}`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  for (const grid of GRIDS) await pixelate(grid)
  await writeSocial()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
