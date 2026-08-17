/**
 * Extension device credentials and sessions.
 *
 * Two distinct secrets, deliberately:
 *
 *  1. DEVICE CREDENTIAL — long-lived, issued once at pairing exchange. It is
 *     NOT an access token: presenting it grants no API data, only the right to
 *     mint a short-lived extension session. This is why a Chrome restart does
 *     not force re-pairing while revocation still takes effect quickly.
 *
 *  2. EXTENSION SESSION — short-lived bearer token used for actual requests.
 *
 * Neither is ever stored in plaintext. The database holds SHA-256 hashes, so
 * a database disclosure yields nothing usable. Lookups are by hash, which is
 * why the credential must be high-entropy (128 bits) — a hash lookup cannot
 * be salted per-row and still be findable, and high entropy is what makes
 * that safe against precomputation.
 */

import { createHash } from "node:crypto"
import { randomId } from "./crypto"

/** Short enough that a stolen session expires quickly, long enough to be usable. */
export const EXTENSION_SESSION_TTL_MS = 1000 * 60 * 60 // 1 hour

export const DEVICE_CREDENTIAL_PREFIX = "liend_dc_"
export const EXTENSION_TOKEN_PREFIX = "liend_es_"

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("base64url")
}

export function issueDeviceCredential(): { credential: string; hash: string } {
  const credential = DEVICE_CREDENTIAL_PREFIX + randomId(32)
  return { credential, hash: hashSecret(credential) }
}

export function issueExtensionToken(): { token: string; hash: string } {
  const token = EXTENSION_TOKEN_PREFIX + randomId(32)
  return { token, hash: hashSecret(token) }
}

/** Extracts a Bearer credential without leaking it into an error message. */
export function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const [scheme, ...rest] = header.split(" ")
  if (scheme.toLowerCase() !== "bearer") return null
  const value = rest.join(" ").trim()
  return value.length > 0 ? value : null
}

/**
 * Authorization classes.
 *
 * An extension device session is intentionally weaker than an app session:
 * it may read contextual LIEND data, and nothing else. Anything that moves
 * value stays an App + wallet-signature responsibility.
 */
export type Authorization =
  | { kind: "app-user"; address: string; sessionId: string }
  | { kind: "extension-device"; address: string; deviceId: string }

export const EXTENSION_SCOPES = ["read:utility-access", "read:position-context"] as const
export type ExtensionScope = (typeof EXTENSION_SCOPES)[number]

export function extensionCan(scope: string): scope is ExtensionScope {
  return (EXTENSION_SCOPES as readonly string[]).includes(scope)
}
