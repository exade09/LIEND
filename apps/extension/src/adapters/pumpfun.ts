/**
 * pump.fun adapter.
 *
 * Detection uses the route pattern verified in Phase 1 research against the
 * live site: token pages are `/coin/<mint>`, and the mint is echoed into both
 * `<link rel="canonical">` and `<meta property="og:url">`.
 *
 * Deliberately NOT used: CSS class names, DOM structure, or any displayed
 * price/liquidity figure. Those change with every redesign, and scraped
 * numbers must never become LIEND financial truth. This detector survives a
 * full visual redesign of pump.fun because it only reads URLs.
 */

import type { DetectionResult, SiteAdapter } from "./types"
import { isValidMint } from "./types"
import { mountTrigger } from "@/content/trigger"

const HOSTS = new Set(["pump.fun", "www.pump.fun"])

function stripTrailingSlash(pathname: string): string {
  let end = pathname.length
  while (end > 0 && pathname[end - 1] === "/") end -= 1
  return pathname.slice(0, end)
}

/** Extracts a mint from a `/coin/<mint>` path. Null for any other route. */
export function mintFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 2 || parts[0] !== "coin") return null
  return isValidMint(parts[1]) ? parts[1] : null
}

/** Extracts a mint from an absolute pump.fun URL, if it is a coin route. */
export function mintFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (!HOSTS.has(url.hostname)) return null
    return mintFromPath(url.pathname)
  } catch {
    return null
  }
}

export function readCanonicalMint(doc: Document): string | null {
  const link = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  return mintFromUrl(link?.href ?? null)
}

export function readOgUrlMint(doc: Document): string | null {
  const meta = doc.querySelector<HTMLMetaElement>('meta[property="og:url"]')
  return mintFromUrl(meta?.content ?? null)
}

/**
 * Evidence policy.
 *
 * The URL is the PRIMARY authority: `/coin/<valid mint>` is what pump.fun
 * routed to and what the user sees in the address bar. canonical and og:url
 * are corroboration, not permission.
 *
 *  - No contradicting metadata  -> `corroborated`, publish immediately.
 *    (Missing metadata is not disagreement; on first paint the head may be
 *    empty, and requiring it would break initial detection.)
 *
 *  - Metadata names a different token -> `pending`, but ONLY while the
 *    controller's grace period is open. On a client-side transition the head
 *    lags the URL, so a contradiction usually means the head still describes
 *    the token we just left.
 *
 *  - Grace expired (`allowUrlOnly`) -> accept the URL mint as `url-only`.
 *    Some pump.fun routes never refresh canonical/og after a SPA navigation,
 *    and waiting for corroboration that will never arrive is what pinned the
 *    panel on "Detecting token…" indefinitely. We still never invent a mint:
 *    the accepted value always comes from the current URL.
 */
export function evaluateEvidence(
  url: URL,
  doc: Document,
  allowUrlOnly = false,
): DetectionResult {
  const fromPath = mintFromPath(url.pathname)
  if (!fromPath) return { status: "none" }

  const context = {
    source: "pumpfun" as const,
    chain: "solana" as const,
    mint: fromPath,
    pageUrl: `${url.origin}${url.pathname}`,
    detectedAt: Date.now(),
  }

  const confirmations = [readCanonicalMint(doc), readOgUrlMint(doc)].filter(
    (value): value is string => value !== null,
  )

  const contradicted = confirmations.some((value) => value !== fromPath)

  if (!contradicted) return { status: "token", context, confidence: "corroborated" }
  if (allowUrlOnly) return { status: "token", context, confidence: "url-only" }
  return { status: "pending" }
}

export const pumpfunAdapter: SiteAdapter = {
  id: "pumpfun",

  matches(url) {
    return HOSTS.has(url.hostname)
  },

  identify(url) {
    const mint = mintFromPath(url.pathname)
    // Token pages are identified by the mint alone, so ?tab=, #hash and
    // analytics parameters cannot masquerade as navigation.
    if (mint) return `pumpfun:${mint}`
    return `pumpfun:route:${stripTrailingSlash(url.pathname) || "/"}`
  },

  detect(url, doc, allowUrlOnly) {
    return evaluateEvidence(url, doc, allowUrlOnly)
  },

  observeNavigation(onChange) {
    /**
     * Reports every navigation signal without filtering.
     *
     * Deduplication deliberately lives in ONE place — the controller's page
     * identity check — rather than being split between here and there. Two
     * independent filters was how duplicate signals still slipped through and
     * restarted the detection deadline.
     */
    const notify = () => onChange()

    // pump.fun is a client-routed app, so no load event fires between tokens.
    // We observe History API calls without altering their behaviour — the
    // original is always invoked and its return value passed through.
    const originalPush = history.pushState
    const originalReplace = history.replaceState

    history.pushState = function (...args) {
      const result = originalPush.apply(this, args)
      notify()
      return result
    }
    history.replaceState = function (...args) {
      const result = originalReplace.apply(this, args)
      notify()
      return result
    }

    // Back/forward.
    window.addEventListener("popstate", notify)

    return () => {
      history.pushState = originalPush
      history.replaceState = originalReplace
      window.removeEventListener("popstate", notify)
    }
  },

  mountTrigger(onOpen) {
    return mountTrigger(onOpen)
  },
}
