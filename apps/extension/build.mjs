/**
 * LIEND extension build.
 *
 * Plain esbuild plus a generated manifest — no extension framework. That
 * keeps the manifest (where the whole permission story lives) fully explicit
 * and reviewable, and keeps the bundle small enough for instant panel paint.
 *
 * Origins are injected here from the environment, so no Vercel URL or future
 * custom domain appears in source. Migrating domains is a rebuild.
 *
 *   node build.mjs          -> dist/
 *   node build.mjs --zip    -> dist/ + release/liend-extension.zip
 */

import { build } from "esbuild"
import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
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
  name: "LONS",
  version: VERSION,
  description: "Liquidity context for supported Robinhood Chain token pages.",
  minimum_chrome_version: "116",
  icons: { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
  action: {
    default_title: "LONS",
    default_icon: { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
  },
  background: { service_worker: "background.js", type: "module" },
  side_panel: { default_path: "sidepanel.html" },
  permissions: ["sidePanel", "storage", "tabs"],
  host_permissions: [
    "https://ponsfamily.com/*",
    "https://www.ponsfamily.com/*",
    ...(API_URL ? [`${API_URL.replace(/\/$/, "")}/*`] : []),
  ],
  content_scripts: [
    {
      matches: ["https://ponsfamily.com/*", "https://www.ponsfamily.com/*"],
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
      __LIEND_APP_URL__: JSON.stringify(APP_URL),
      __LIEND_API_URL__: JSON.stringify(API_URL),
      __LIEND_VERSION__: JSON.stringify(VERSION),
      __LIEND_DEBUG__: JSON.stringify((process.env.LONS_DEBUG ?? process.env.LIEND_DEBUG) === "1"),
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
      __LIEND_APP_URL__: JSON.stringify(APP_URL),
      __LIEND_API_URL__: JSON.stringify(API_URL),
      __LIEND_VERSION__: JSON.stringify(VERSION),
      __LIEND_DEBUG__: JSON.stringify((process.env.LONS_DEBUG ?? process.env.LIEND_DEBUG) === "1"),
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
 */
async function zip() {
  await mkdir(release, { recursive: true })
  const target = path.join(release, "liend-extension.zip")
  await rm(target, { force: true })

  // PowerShell's Compress-Archive is available on Windows without extra deps.
  const items = (await readdir(dist)).map((entry) => `'${path.join(dist, entry)}'`).join(",")
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path ${items} -DestinationPath '${target}' -Force`,
  ])
  return target
}

await bundle()
const files = await listFiles(dist)
console.log(`[lons] built ${files.length} files into dist/`)
for (const file of files) console.log(`        ${file}`)

if (process.argv.includes("--zip")) {
  const target = await zip()
  console.log(`[lons] packaged ${path.relative(root, target)}`)
}
