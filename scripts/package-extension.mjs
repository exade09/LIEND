/**
 * Repackages the Chrome extension archive the landing page hands out.
 *
 * The archive is a committed binary, so it goes stale silently: the copy in
 * public/ was still asking for ponsfamily.com host permissions and calling
 * api.liend.app, a domain that no longer resolves, long after the source had
 * moved to pump.fun and api.lons.live. Nobody saw it because a zip does not
 * show up in a diff and no test opens it.
 *
 * Building it as part of the site build means the download can never describe
 * a different extension from the one in this repository.
 *
 * Origins come from the environment. Without them the extension would build a
 * "not configured" panel, which is worse than what is already committed, so in
 * that case the existing archive is left exactly as it is.
 */

import { execFileSync } from "node:child_process"
import { copyFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const extension = path.join(root, "apps", "extension")
const archive = path.join(extension, "release", "lons-extension.zip")
const destination = path.join(root, "public", "lons-extension.zip")

const appUrl = (process.env.LONS_APP_URL ?? process.env.LIEND_APP_URL ?? "").trim()
const apiUrl = (process.env.LONS_API_URL ?? process.env.LIEND_API_URL ?? "").trim()

if (!appUrl || !apiUrl) {
  console.warn("[lons] LONS_APP_URL/LONS_API_URL are not set - keeping the committed extension archive")
  process.exit(0)
}

execFileSync(process.execPath, [path.join(extension, "build.mjs"), "--zip"], {
  cwd: extension,
  stdio: "inherit",
  env: { ...process.env, LONS_APP_URL: appUrl, LONS_API_URL: apiUrl },
})

await mkdir(path.dirname(destination), { recursive: true })
await copyFile(archive, destination)
console.log(`[lons] extension archive refreshed for ${apiUrl}`)
