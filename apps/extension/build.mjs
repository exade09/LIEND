/**
 * Lons extension build.
 *
 * Plain esbuild plus a generated manifest — no extension framework. That
 * keeps the manifest (where the whole permission story lives) fully explicit
 * and reviewable, and keeps the bundle small enough for instant panel paint.
 *
 * Origins are injected here from the environment, so no Vercel URL or future
 * custom domain appears in source. Migrating domains is a rebuild.
 *
 *   node build.mjs          -> dist/
 *   node build.mjs --zip    -> dist/ + release/lons-extension.zip
 */

import { build } from "esbuild"
import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { deflateRawSync } from "node:zlib"

const root = path.resolve(import.meta.dirname)
const dist = path.join(root, "dist")
const release = path.join(root, "release")

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const VERSION = pkg.version

// Configuration comes from the environment. Empty values are allowed so a
// build always succeeds; the panel then renders an explicit "not configured"
// state rather than pointing at a guessed origin.
const APP_URL = (process.env.LONS_APP_URL ?? process.env.LIEND_APP_URL ?? "").trim()
const API_URL = (process.env.LONS_API_URL ?? process.env.LIEND_API_URL ?? "").trim()

if (!APP_URL || !API_URL) {
  console.warn(
    "[lons] WARNING: app/API origins are not set.\n" +
      "         The extension will build but render a 'not configured' state.\n" +
      "         Set both and rebuild before distributing.",
  )
}

/**
 * Manifest V3.
 *
 * Every permission is justified in docs/EXTENSION.md. Notably absent:
 * <all_urls>, webRequest, cookies, history, scripting, and any Axiom host —
 * Axiom stays out until its real page behaviour can be verified.
 */
const manifest = {
  manifest_version: 3,
  name: "Lons",
  version: VERSION,
  description: "Lons liquidity context for supported Robinhood Chain token pages.",
  minimum_chrome_version: "116",
  icons: { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
  action: {
    default_title: "Lons",
    default_icon: { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
  },
  background: { service_worker: "background.js", type: "module" },
  side_panel: { default_path: "sidepanel.html" },
  permissions: ["sidePanel", "storage", "tabs"],
  host_permissions: [
    "https://pump.fun/*",
    "https://www.pump.fun/*",
    ...(API_URL ? [`${API_URL.replace(/\/$/, "")}/*`] : []),
  ],
  content_scripts: [
    {
      matches: ["https://pump.fun/*", "https://www.pump.fun/*"],
      js: ["content.js"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
  // No remote code, ever. MV3 forbids it and this makes it explicit.
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
}

async function bundle() {
  await rm(dist, { recursive: true, force: true })
  await mkdir(dist, { recursive: true })

  await build({
    entryPoints: {
      background: path.join(root, "src/background/index.ts"),
      content: path.join(root, "src/content/index.ts"),
      sidepanel: path.join(root, "src/sidepanel/index.ts"),
    },
    outdir: dist,
    bundle: true,
    format: "esm",
    target: ["chrome116"],
    minify: true,
    sourcemap: false,
    legalComments: "none",
    define: {
      __LONS_APP_URL__: JSON.stringify(APP_URL),
      __LONS_API_URL__: JSON.stringify(API_URL),
      __LONS_VERSION__: JSON.stringify(VERSION),
      __LONS_DEBUG__: JSON.stringify((process.env.LONS_DEBUG ?? process.env.LIEND_DEBUG) === "1"),
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    alias: { "@": path.join(root, "src") },
  })

  // Content scripts cannot be ES modules in MV3; rebuild that one as IIFE.
  await build({
    entryPoints: [path.join(root, "src/content/index.ts")],
    outfile: path.join(dist, "content.js"),
    bundle: true,
    format: "iife",
    target: ["chrome116"],
    minify: true,
    legalComments: "none",
    define: {
      __LONS_APP_URL__: JSON.stringify(APP_URL),
      __LONS_API_URL__: JSON.stringify(API_URL),
      __LONS_VERSION__: JSON.stringify(VERSION),
      __LONS_DEBUG__: JSON.stringify((process.env.LONS_DEBUG ?? process.env.LIEND_DEBUG) === "1"),
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    alias: { "@": path.join(root, "src") },
    allowOverwrite: true,
  })

  await cp(path.join(root, "public"), dist, { recursive: true })
  await writeFile(path.join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
}

async function listFiles(dir, prefix = "") {
  const out = []
  for (const entry of (await readdir(dir)).sort()) {
    const full = path.join(dir, entry)
    const info = await stat(full)
    if (info.isDirectory()) out.push(...(await listFiles(full, `${prefix}${entry}/`)))
    else out.push(`${prefix}${entry}`)
  }
  return out
}

/**
 * Zips the CONTENTS of dist/, not dist/ itself, so "Load unpacked" points at
 * a folder containing manifest.json with no confusing extra nesting.
 *
 * Written out by hand against the ZIP spec rather than shelled out to a
 * system tool. This used to call PowerShell's Compress-Archive, which works on
 * the machine it was written on and nowhere else: the moment the site build
 * started producing this archive on Linux, the whole deploy failed with
 * `spawn powershell.exe ENOENT`. zlib is in the standard library and the
 * format is small enough to be honest about.
 */
async function zip() {
  await mkdir(release, { recursive: true })
  const target = path.join(release, "lons-extension.zip")
  await rm(target, { force: true })

  const names = await listFiles(dist)
  const locals = []
  const directory = []
  let offset = 0

  for (const name of names) {
    const raw = await readFile(path.join(dist, name))
    // Level 9, stored as raw deflate - which is what method 8 means here.
    const compressed = deflateRawSync(raw, { level: 9 })
    const crc = crc32(raw)
    const encoded = Buffer.from(name, "utf8")

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt32LE(0, 10) // no timestamp: byte-identical rebuilds
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(encoded.length, 26)
    locals.push(local, encoded, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(0, 12)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(encoded.length, 28)
    central.writeUInt32LE(offset, 42)
    directory.push(central, encoded)

    offset += local.length + encoded.length + compressed.length
  }

  const centralBytes = Buffer.concat(directory)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(names.length, 8)
  end.writeUInt16LE(names.length, 10)
  end.writeUInt32LE(centralBytes.length, 12)
  end.writeUInt32LE(offset, 16)

  await writeFile(target, Buffer.concat([...locals, centralBytes, end]))
  return target
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

await bundle()
const files = await listFiles(dist)
console.log(`[lons] built ${files.length} files into dist/`)
for (const file of files) console.log(`        ${file}`)

if (process.argv.includes("--zip")) {
  const target = await zip()
  console.log(`[lons] packaged ${path.relative(root, target)}`)
}
