/**
 * Build-time configuration.
 *
 * Origins are injected by `build.mjs` via esbuild `define`, so no Vercel URL
 * or future custom domain appears in source. Migrating domains is a rebuild
 * with different env values — see docs/CUSTOM-DOMAIN-MIGRATION.md.
 */

declare const __LIEND_APP_URL__: string
declare const __LIEND_API_URL__: string
declare const __LIEND_VERSION__: string

function clean(value: string): string {
  const trimmed = (value ?? "").trim()
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
}

export const APP_URL = clean(__LIEND_APP_URL__)
export const API_URL = clean(__LIEND_API_URL__)
export const VERSION = __LIEND_VERSION__

export function isConfigured(): boolean {
  return APP_URL.length > 0 && API_URL.length > 0
}
