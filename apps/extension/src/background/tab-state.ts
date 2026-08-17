/**
 * Per-tab page state.
 *
 * State is keyed on the content script's normalised page IDENTITY plus a
 * monotonic generation, not on a URL string. That matters because:
 *
 *  - `MessageSender.url` is not reliably updated after a same-document
 *    navigation, so it cannot be used to judge freshness.
 *  - Query strings churn constantly on client-routed sites, so raw URL
 *    comparison produces spurious "the page changed" conclusions.
 *
 * `acceptUpdate` is the single place that decides whether an inbound update
 * may replace what is stored, and `resolveForDisplay` is the single place
 * that decides what the panel may show.
 */

import type { TokenContext } from "@/shared/messages"

export type TabPhase = "detecting" | "token" | "none" | "failed"

export type TabState = {
  identity: string
  generation: number
  phase: TabPhase
  /** Present only for `token`. */
  context: TokenContext | null
}

/**
 * Decides whether an inbound message may update stored state.
 *
 * Rules, in order:
 *  - Nothing stored yet -> accept.
 *  - Different identity -> accept (a real navigation).
 *  - Same identity, newer or equal generation -> accept.
 *  - Same identity, older generation -> REJECT (late result from a
 *    superseded navigation).
 */
export function acceptUpdate(
  stored: TabState | null,
  incoming: { identity: string; generation: number },
): boolean {
  if (!stored) return true
  if (stored.identity !== incoming.identity) return true
  return incoming.generation >= stored.generation
}

/**
 * Decides whether a NAVIGATION_STARTED may push the panel back to detecting.
 *
 * A duplicate signal for an identity that has ALREADY resolved must not
 * regress the panel — that flicker back to "Detecting token…" was part of the
 * observed multi-second hang.
 */
export function shouldEnterDetecting(
  stored: TabState | null,
  incoming: { identity: string; generation: number },
): boolean {
  if (!stored) return true
  if (stored.identity !== incoming.identity) return true
  // Same identity: only a strictly newer generation may re-open detection.
  if (incoming.generation > stored.generation) return true
  return stored.phase === "detecting"
}

/**
 * What the panel may show for a tab.
 *
 * `currentIdentity` is derived from the tab's live URL by the caller. If the
 * stored state describes a different identity it is stale — report
 * `detecting` rather than a token belonging to another page.
 */
export function resolveForDisplay(
  stored: TabState | null,
  currentIdentity: string | null,
): TabState | null {
  if (!currentIdentity) return null
  if (!stored) return null
  if (stored.identity !== currentIdentity) {
    return { identity: currentIdentity, generation: stored.generation, phase: "detecting", context: null }
  }
  return stored
}
