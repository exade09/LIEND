/**
 * Site adapter contract.
 *
 * Adapters are intentionally narrow: they identify which token the user is
 * looking at, notice navigation, and mount a trigger. They may not perform
 * network requests, read wallet state, touch host storage, or interpret any
 * financial value on the page.
 */

import type { SupportedSource, TokenContext } from "@/shared/messages"

/**
 * How strongly the current evidence supports the detected mint.
 *
 *  - `corroborated` — the URL names a mint and no metadata contradicts it.
 *  - `url-only`     — the URL names a valid mint but metadata still describes
 *                     a different token. Accepted only after a grace period
 *                     has elapsed with the URL unchanged (see the controller).
 *
 * The distinction exists so the fallback is an explicit, auditable decision
 * rather than a silent loosening of the corroboration rule.
 */
export type DetectionConfidence = "corroborated" | "url-only"

/**
 * Detection outcome.
 *
 * The three-way split is essential on a client-routed site. During a SPA
 * transition the URL updates before the document head, so path and canonical
 * briefly name different tokens. Collapsing that into "no token" made the
 * panel fall back to an empty state mid-navigation; `pending` says "this looks
 * like a token route but the evidence has not converged yet", which the caller
 * answers with a bounded retry — and, once that budget is spent, with the
 * url-only fallback rather than waiting forever.
 */
export type DetectionResult =
  /** Safe to publish. */
  | { status: "token"; context: TokenContext; confidence: DetectionConfidence }
  /** Token route, evidence not yet consistent. Retry within a bounded window. */
  | { status: "pending" }
  /** Not a token route at all. Resolve immediately. */
  | { status: "none" }

export interface SiteAdapter {
  readonly id: SupportedSource
  /** Whether this adapter handles the given location. */
  matches(url: URL): boolean
  /**
   * Normalised page identity — the unit of navigation.
   *
   * Two URLs share an identity when they represent the same LIEND context,
   * so query strings, hashes and metadata churn never look like navigation.
   * Token pages collapse to the mint; everything else to the route.
   */
  identify(url: URL): string
  /**
   * Pure read of the current page.
   *
   * `allowUrlOnly` is set by the controller once the corroboration grace
   * period has expired. The adapter never decides that timing itself.
   */
  detect(url: URL, doc: Document, allowUrlOnly?: boolean): DetectionResult
  /**
   * Subscribe to client-side navigation.
   *
   * Fires as soon as the page identity changes — deliberately undebounced,
   * because the caller must invalidate stale context immediately.
   */
  observeNavigation(onChange: () => void): () => void
  /** Mount the LIEND trigger. Returns an unmount function. */
  mountTrigger(onOpen: () => void): () => void
}

/** Base58, 32-44 chars — the Solana mint shape. */
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isValidMint(value: string | null | undefined): value is string {
  return typeof value === "string" && MINT_RE.test(value)
}

/**
 * Page identity: origin + path, ignoring query and hash.
 *
 * Navigation is keyed on this rather than the full href because client-routed
 * apps rewrite query strings constantly (tab state, referrers, scroll
 * restoration). Treating those rewrites as navigations restarts detection
 * endlessly and is one of the ways the panel got stuck.
 */
export function pageIdentity(url: URL): string {
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`
}
