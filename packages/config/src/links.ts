/**
 * External LIEND destinations.
 *
 * PRODUCT FACT (approved): the real Pump.fun, X and docs destinations do not
 * exist yet. Every entry is nullable and unset by default. A null link means
 * the surface must hide or disable that affordance — never render a guessed
 * URL and never fall back to a service root such as `https://pump.fun/`.
 */

import { parseOrigin } from "./origins"

/**
 * How the extension is currently distributed.
 * `download` — a hosted archive plus manual install steps (pre-listing).
 * `webstore` — a real Chrome Web Store listing.
 *
 * PRODUCT FACT (approved): no Web Store account or listing exists, so the
 * initial mode is `download`. Switching later is configuration only; no
 * landing or app code changes.
 */
export type ExtensionDistributionMode = "download" | "webstore"

export type ProjectLinks = {
  pons: string | null
  x: string | null
  docs: string | null
  /** Archive download or Web Store listing, depending on `extensionMode`. */
  extension: string | null
  extensionMode: ExtensionDistributionMode
}

export function resolveExtensionMode(raw: string | undefined | null): ExtensionDistributionMode {
  return raw === "webstore" ? "webstore" : "download"
}

export function resolveProjectLinks(env: {
  pons?: string | null
  x?: string | null
  docs?: string | null
  extension?: string | null
  extensionMode?: string | null
}): ProjectLinks {
  return {
    pons: parseOrigin(env.pons) ?? "https://www.ponsfamily.com",
    x: parseOrigin(env.x),
    docs: parseOrigin(env.docs),
    extension: parseOrigin(env.extension),
    extensionMode: resolveExtensionMode(env.extensionMode),
  }
}
