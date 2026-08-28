/**
 * Safe App URL construction.
 *
 * Every App link in the product — landing CTA, future extension deep link,
 * API redirect — is built here against a configured base. Two rules:
 *
 *  1. The base origin always comes from configuration, never a literal.
 *  2. Deep links carry navigation context only (mint, source). They never
 *     carry balances, eligibility, quotes or any other financial value; the
 *     App re-fetches all of that from the API after arrival.
 */

import { parseMint } from "./token"

/** Where an extension-originated link came from. Attribution only — never affects authorization. */
export type DeepLinkSource = "pons" | "landing" | "extension"

const SOURCES: readonly DeepLinkSource[] = ["pons", "landing", "extension"]

export function isDeepLinkSource(value: unknown): value is DeepLinkSource {
  return typeof value === "string" && (SOURCES as readonly string[]).includes(value)
}

function build(
  appBaseUrl: string,
  path: string,
  params?: Record<string, string | undefined>,
): string {
  const base = appBaseUrl.endsWith("/") ? appBaseUrl.slice(0, -1) : appBaseUrl
  const url = new URL(base + path)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

export function dashboardUrl(appBaseUrl: string): string {
  return build(appBaseUrl, "/")
}

export function positionsUrl(appBaseUrl: string): string {
  return build(appBaseUrl, "/positions")
}

/** Position detail — the future extension deep-link target. Returns null for an invalid mint. */
export function positionUrl(
  appBaseUrl: string,
  mint: string,
  source?: DeepLinkSource,
): string | null {
  const valid = parseMint(mint)
  if (!valid) return null
  return build(appBaseUrl, `/positions/${valid}`, { src: source })
}

/** Pairing approval screen. `requestId` is an opaque identifier, never a credential. */
export function pairUrl(appBaseUrl: string, requestId: string): string {
  return build(appBaseUrl, "/pair", { request: requestId })
}

/**
 * Builds an auth URL that returns the user to where they were heading.
 * `returnTo` is always a relative path — see `sanitizeReturnTo`.
 */
export function authUrl(appBaseUrl: string, returnTo?: string): string {
  const safe = returnTo ? sanitizeReturnTo(returnTo) : null
  return build(appBaseUrl, "/auth", { returnTo: safe ?? undefined })
}

/**
 * Accepts only same-origin relative paths, closing open-redirect attacks.
 *
 * Rejects absolute URLs, protocol-relative `//host`, backslash variants that
 * some parsers normalise to `//`, and any string containing ASCII control
 * characters or whitespace (which parsers may strip before resolving, and
 * which can therefore be used to smuggle a scheme past the prefix checks).
 */
export function sanitizeReturnTo(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith("/")) return null
  if (trimmed.startsWith("//")) return null
  if (trimmed.startsWith("/\\")) return null

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f) return null
    if (code === 0x5c) return null // backslash anywhere
  }

  return trimmed
}
