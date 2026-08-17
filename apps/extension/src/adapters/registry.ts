/**
 * Adapter registry.
 *
 * Adding a platform is a new file plus an entry here — the content script
 * itself stays platform-agnostic, which is what keeps this from degenerating
 * into a pile of site-specific special cases.
 *
 * AXIOM: intentionally absent. Phase 1 could not verify its production page
 * behaviour (the site returned HTTP 403 to inspection, and much of it is
 * behind authentication). Shipping a guessed adapter onto a live trading
 * surface risks silent mis-detection, which is the worst failure mode this
 * product has. The contract in `./types.ts` is ready for it; the adapter and
 * its host permission are added only once real page evidence exists.
 */

import { pumpfunAdapter } from "./pumpfun"
import type { SiteAdapter } from "./types"

const ADAPTERS: readonly SiteAdapter[] = [pumpfunAdapter]

/** At most one adapter handles a page. Returns null on unsupported sites. */
export function selectAdapter(url: URL): SiteAdapter | null {
  return ADAPTERS.find((adapter) => adapter.matches(url)) ?? null
}

export function supportedHostnames(): string[] {
  return ["pump.fun"]
}
