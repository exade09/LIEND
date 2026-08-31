/**
 * Message contracts between extension components.
 *
 * The content script runs inside an attacker-controllable page and is treated
 * as untrusted. Every message it sends is validated against these schemas by
 * the service worker before anything acts on it.
 *
 * Design rules enforced here:
 *  - A closed union. Unknown `type` values are rejected outright.
 *  - No generic privileged RPC. There is deliberately no `fetchUrl`,
 *    `openUrl`, or `getSession` message — a compromised content script must
 *    not be able to make the worker fetch arbitrary URLs or hand back secrets.
 *  - No message returns a credential of any kind.
 *  - Content-script messages carry identification only, never financial values.
 */

import { z } from "zod"
import { EvmAddress } from "@liend/domain"

/** Sites the extension is allowed to act on. Axiom is defined but disabled. */
export const SupportedSourceSchema = z.enum(["pons"])
export type SupportedSource = z.infer<typeof SupportedSourceSchema>

export const TokenContextSchema = z.object({
  source: SupportedSourceSchema,
  chain: z.literal("robinhood"),
  mint: EvmAddress,
  pageUrl: z.string().url(),
  detectedAt: z.number().int().positive(),
})
export type TokenContext = z.infer<typeof TokenContextSchema>

// --- content script -> service worker ---------------------------------------

/**
 * Navigation-scoped fields carried by every content-script message.
 *
 * The worker uses these to reject stale results: a message whose generation
 * is older than what the tab has already recorded for the same identity is
 * discarded. This replaces the previous reliance on MessageSender.url, which
 * Chrome does not reliably update after a same-document navigation.
 */
const NavigationScope = {
  identity: z.string().min(1).max(128),
  generation: z.number().int().nonnegative(),
}

export const FromContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TOKEN_CONTEXT"), context: TokenContextSchema, ...NavigationScope }),
  /** Real navigation to a new identity. Panel -> detecting. */
  z.object({
    type: z.literal("NAVIGATION_STARTED"),
    source: SupportedSourceSchema,
    pageUrl: z.string().url(),
    ...NavigationScope,
  }),
  z.object({ type: z.literal("CONTEXT_CLEARED"), source: SupportedSourceSchema, ...NavigationScope }),
  /** Detection could not complete. Retryable — never a permanent spinner. */
  z.object({ type: z.literal("DETECTION_FAILED"), source: SupportedSourceSchema, ...NavigationScope }),
  /** Deliberately argument-free: the panel target is decided by the worker. */
  z.object({ type: z.literal("REQUEST_PANEL_OPEN") }),
])

export type FromContent = z.infer<typeof FromContentSchema>

// --- side panel -> service worker -------------------------------------------

export const FromPanelSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("GET_STATE") }),
  z.object({ type: z.literal("START_PAIRING") }),
  z.object({ type: z.literal("CANCEL_PAIRING") }),
  z.object({ type: z.literal("DISCONNECT") }),
  z.object({ type: z.literal("REFRESH") }),
  z.object({ type: z.literal("OPEN_IN_LONS") }),
  z.object({ type: z.literal("OPEN_APP") }),
])
export type FromPanel = z.infer<typeof FromPanelSchema>

// --- service worker -> side panel -------------------------------------------

/**
 * The panel renders exclusively from this snapshot. It never talks to the
 * content script and never calls the API itself, so there is one data path
 * and one place to audit.
 */
export type PanelSnapshot = {
  connection: "first-install" | "disconnected" | "pairing" | "connected" | "session-expired"
  /** Present while pairing so the user can compare it with the App. */
  pairing: { userCode: string; expiresAt: number } | null
  page: "unsupported" | "supported-no-token" | "token" | "detecting" | "detection-failed"
  context: TokenContext | null
  /** Trusted, API-derived. Never computed in the extension. */
  utility:
    | { state: "unknown" }
    | { state: "token-not-launched" }
    | { state: "holder-check-pending" }
    | { state: "not-eligible"; requirementPublished: boolean }
    | { state: "eligible" }
  loading: boolean
  error: string | null
  version: string
}

/** Narrow a message from an untrusted sender. Returns null on any mismatch. */
export function parseFromContent(value: unknown): FromContent | null {
  const result = FromContentSchema.safeParse(value)
  return result.success ? result.data : null
}

export function parseFromPanel(value: unknown): FromPanel | null {
  const result = FromPanelSchema.safeParse(value)
  return result.success ? result.data : null
}
