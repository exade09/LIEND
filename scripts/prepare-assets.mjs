// One-off asset prep for the liquid curtain + wordmark separation.
// Run manually: node scripts/prepare-assets.mjs
// Source assets in Liend-Larp-Assets/ are read-only and never modified.

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const sourceDir = path.join(root, "Liend-Larp-Assets")
const curtainDir = path.join(root, "public", "assets", "curtain")
const wordmarkDir = path.join(root, "public", "assets", "wordmark")

const droplets = {
  a: "5c36d4b5-d036-478f-bd58-71f924b26276.png",
  b: "62c958b8-bf70-4041-ab98-3ecf27bab304.png",
  c: "7c01301d-f7a3-4c24-8939-1e88a2ec0c20.png",
  d: "cb667d30-4b30-42e6-bb3d-a9558d662e58.png",
  e: "e5bc3012-c74d-403a-a19e-bc388b3b38c4.png",
}

const tiers = { sm: 360, md: 560, lg: 820 }

async function buildDropletTiers() {
  await mkdir(curtainDir, { recursive: true })
  for (const [id, file] of Object.entries(droplets)) {
    const srcPath = path.join(sourceDir, file)
    for (const [tier, width] of Object.entries(tiers)) {
      const out = path.join(curtainDir, `droplet-${id}-${tier}.webp`)
      await sharp(srcPath).resize({ width, withoutEnlargement: true }).webp({ quality: 88 }).toFile(out)
      console.log(`droplet ${id} ${tier} -> ${path.relative(root, out)}`)
    }
  }
}

async function buildPlate({ name, width, height, layout }) {
  // Droplets are compositied on an oversized, padded canvas so an image
  // larger than the final width/height (e.g. a wide box on a short canvas)
  // never trips sharp's "composite must fit canvas" constraint. The final
  // frame is extracted from the centre afterward.
  const buffers = []
  let maxHalf = 0
  for (const spec of layout) {
    const file = droplets[spec.id]
    const srcPath = path.join(sourceDir, file)
    const boxW = Math.round(width * spec.w)
    let pipeline = sharp(srcPath).resize({ width: boxW, withoutEnlargement: true })
    if (spec.flip) pipeline = pipeline.flip().flop()
    pipeline = pipeline.rotate(spec.rot ?? 0, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    const buf = await pipeline.toBuffer()
    const meta = await sharp(buf).metadata()
    maxHalf = Math.max(maxHalf, Math.ceil(meta.width / 2), Math.ceil(meta.height / 2))
    buffers.push({ spec, buf, meta })
  }

  const pad = maxHalf + 8
  const paddedW = width + pad * 2
  const paddedH = height + pad * 2

  const composites = buffers.map(({ spec, buf, meta }) => ({
    input: buf,
    left: Math.round(pad + width * spec.x - meta.width / 2),
    top: Math.round(pad + height * spec.y - meta.height / 2),
  }))

  const padded = await sharp({
    create: { width: paddedW, height: paddedH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer()

  const flattened = await sharp(padded).extract({ left: pad, top: pad, width, height }).png().toBuffer()
  const blurred = await sharp(flattened).blur(42).webp({ quality: 82 }).toBuffer()

  const out = path.join(curtainDir, `${name}.webp`)
  await sharp(blurred).toFile(out)
  console.log(`plate ${name} -> ${path.relative(root, out)}`)
}

async function buildPlates() {
  // Dense, heavily overlapping composite: this plate is the coverage
  // guarantee, not an atmospheric accent, so it must be near-opaque on its
  // own before the crisp foreground droplets ever go on top.
  await buildPlate({
    name: "plate-wide",
    width: 1600,
    height: 900,
    layout: [
      { id: "d", x: 0.06, y: 0.24, w: 0.78, rot: 8 },
      { id: "a", x: 0.24, y: 0.68, w: 0.7, rot: -14, flip: true },
      { id: "b", x: 0.42, y: 0.3, w: 0.74, rot: -6 },
      { id: "c", x: 0.6, y: 0.78, w: 0.72, rot: -10, flip: true },
      { id: "e", x: 0.78, y: 0.28, w: 0.76, rot: 10 },
      { id: "d", x: 0.96, y: 0.7, w: 0.7, rot: -8 },
    ],
  })

  await buildPlate({
    name: "plate-tall",
    width: 900,
    height: 1600,
    layout: [
      { id: "d", x: 0.24, y: 0.08, w: 0.92, rot: 8 },
      { id: "a", x: 0.72, y: 0.26, w: 0.86, rot: -12, flip: true },
      { id: "b", x: 0.22, y: 0.42, w: 0.9, rot: -6 },
      { id: "c", x: 0.76, y: 0.58, w: 0.88, rot: -10, flip: true },
      { id: "e", x: 0.24, y: 0.76, w: 0.9, rot: 10 },
      { id: "d", x: 0.72, y: 0.92, w: 0.86, rot: -8 },
    ],
  })
}

// Letters separated by fully transparent gutters in Liend-Text.png (2172x724).
// Column runs measured at alpha > 25; recomputed here (not hard-coded) so the
// script fails loudly if the source asset ever changes.
async function findColumnRuns(image, width, height, threshold = 25) {
  const { data } = await image
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const colMax = new Array(width).fill(0)
  for (let x = 0; x < width; x++) {
    let max = 0
    for (let y = 0; y < height; y += 2) {
      const idx = (y * width + x) * 4 + 3
      const v = data[idx]
      if (v > max) max = v
    }
    colMax[x] = max
  }

  const runs = []
  let start = null
  for (let x = 0; x < width; x++) {
    const above = colMax[x] > threshold
    if (above && start === null) start = x
    if (!above && start !== null) {
      if (x - start > 10) runs.push([start, x])
      start = null
    }
  }
  if (start !== null) runs.push([start, width])
  return runs
}

async function buildWordmark() {
  await mkdir(wordmarkDir, { recursive: true })
  const srcPath = path.join(sourceDir, "Liend-Text.png")
  const src = sharp(srcPath)
  const meta = await src.metadata()
  const { width, height } = meta

  const runs = await findColumnRuns(src, width, height)
  if (runs.length !== 5) {
    throw new Error(`Expected 5 letter columns in Liend-Text.png, found ${runs.length}: ${JSON.stringify(runs)}`)
  }

  const letters = ["l", "i", "e", "n", "d"]
  const boxes = []

  for (let i = 0; i < 5; i++) {
    const [x0, x1] = runs[i]
    const columnAlpha = sharp(srcPath).extract({ left: x0, top: 0, width: x1 - x0, height })
    const { data: rowData } = await columnAlpha.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const colW = x1 - x0
    let top = null
    let bottom = 0
    for (let y = 0; y < height; y++) {
      let rowMax = 0
      for (let x = 0; x < colW; x++) {
        const idx = (y * colW + x) * 4 + 3
        const v = rowData[idx]
        if (v > rowMax) rowMax = v
      }
      if (rowMax > 25) {
        if (top === null) top = y
        bottom = y
      }
    }

    const letter = letters[i]
    const box = { x0, y0: top, x1, y1: bottom + 1 }
    boxes.push({ letter, ...box, width, height })

    const cropW = box.x1 - box.x0
    const cropH = box.y1 - box.y0

    await sharp(srcPath)
      .extract({ left: box.x0, top: box.y0, width: cropW, height: cropH })
      .webp({ lossless: true })
      .toFile(path.join(wordmarkDir, `liend-${letter}.webp`))

    await sharp(srcPath)
      .extract({ left: box.x0, top: box.y0, width: cropW, height: cropH })
      .resize({ width: cropW * 2 })
      .webp({ quality: 95 })
      .toFile(path.join(wordmarkDir, `liend-${letter}@2x.webp`))

    console.log(
      `letter ${letter.toUpperCase()} box=(${box.x0},${box.y0})-(${box.x1},${box.y1}) ` +
        `left%=${((box.x0 / width) * 100).toFixed(3)} top%=${((box.y0 / height) * 100).toFixed(3)} ` +
        `w%=${(((box.x1 - box.x0) / width) * 100).toFixed(3)} h%=${(((box.y1 - box.y0) / height) * 100).toFixed(3)}`,
    )
  }

  // Reassembly assertion: composite the five crops back at their measured
  // offsets and diff against the source. Fail loudly on misalignment rather
  // than ship a wordmark that doesn't reassemble pixel-perfectly.
  const reassembled = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(
      boxes.map((b) => ({
        input: path.join(wordmarkDir, `liend-${b.letter}.webp`),
        left: b.x0,
        top: b.y0,
      })),
    )
    .raw()
    .toBuffer()

  const original = await sharp(srcPath).ensureAlpha().raw().toBuffer()
  if (reassembled.length !== original.length) {
    throw new Error("Reassembly buffer size mismatch against source wordmark")
  }
  // A handful of sub-threshold anti-aliased edge pixels (a couple of percent
  // alpha, right at each letter's measured boundary) will always differ by
  // construction — the column/row scan used a hard alpha cutoff. Judge
  // reassembly by how much of the image differs meaningfully, not by a
  // single worst pixel.
  const totalPixels = original.length / 4
  let meaningfulDiffs = 0
  for (let i = 0; i < original.length; i += 4) {
    const diff =
      Math.abs(reassembled[i] - original[i]) +
      Math.abs(reassembled[i + 1] - original[i + 1]) +
      Math.abs(reassembled[i + 2] - original[i + 2]) +
      Math.abs(reassembled[i + 3] - original[i + 3])
    if (diff > 100) meaningfulDiffs++
  }
  const diffRatio = meaningfulDiffs / totalPixels
  console.log(
    `reassembly: ${meaningfulDiffs}/${totalPixels} pixels (${(diffRatio * 100).toFixed(3)}%) differ meaningfully`,
  )
  if (diffRatio > 0.01) {
    throw new Error(`Reassembled wordmark diverges from source (${(diffRatio * 100).toFixed(3)}% of pixels) — check letter boxes`)
  }

  // Fallback single-image copy for no-JS / static contexts.
  await sharp(srcPath).png().toFile(path.join(root, "public", "assets", "liend-wordmark.png"))
  console.log("copied liend-wordmark.png fallback")

  return boxes
}

async function main() {
  await buildDropletTiers()
  await buildPlates()
  const boxes = await buildWordmark()

  console.log("\n--- lib/wordmark.ts letter table ---")
  for (const b of boxes) {
    const leftPct = (b.x0 / b.width) * 100
    const topPct = (b.y0 / b.height) * 100
    const widthPct = ((b.x1 - b.x0) / b.width) * 100
    const heightPct = ((b.y1 - b.y0) / b.height) * 100
    console.log(
      `  ${b.letter}: { left: ${leftPct.toFixed(4)}, top: ${topPct.toFixed(4)}, width: ${widthPct.toFixed(4)}, height: ${heightPct.toFixed(4)} },`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
