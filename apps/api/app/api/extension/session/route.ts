import {
  EXTENSION_SCOPES,
  EXTENSION_SESSION_TTL_MS,
  hashSecret,
  issueExtensionToken,
  readBearer,
} from "@/lib/device-auth"
import { ApiFailure, handle, json, preflight } from "@/lib/http"
import { getRateLimiter, RATE_LIMITS } from "@/lib/rate-limit"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Exchanges a long-lived device credential for a short-lived extension
 * session. This is why a browser restart does not require re-pairing, while
 * revocation still takes effect within one session lifetime.
 *
 * The device credential is looked up by hash; a revoked device is refused.
 */
export function POST(request: Request) {
  return handle(request, async () => {
    const credential = readBearer(request)
    if (!credential) throw new ApiFailure("unauthorized", "Device credential required")

    const budget = RATE_LIMITS.extensionSession
    const limit = await getRateLimiter().check(
      `extsession:${hashSecret(credential).slice(0, 16)}`,
      budget.limit,
      budget.windowMs,
    )
    if (!limit.allowed) throw new ApiFailure("rate_limited", "Too many session requests")

    const store = getStore()
    const device = await store.findDeviceByCredential(hashSecret(credential))
    if (!device) throw new ApiFailure("unauthorized", "Unknown device credential")
    if (device.revokedAt !== null) {
      throw new ApiFailure("unauthorized", "This browser connection has been revoked")
    }

    const now = Date.now()
    const { token, hash } = issueExtensionToken()
    await store.createExtensionSession({
      tokenHash: hash,
      deviceId: device.deviceId,
      expiresAt: now + EXTENSION_SESSION_TTL_MS,
      revokedAt: null,
    })
    await store.touchDevice(device.deviceId, now)

    return json(request, {
      accessToken: token,
      expiresAt: now + EXTENSION_SESSION_TTL_MS,
      // Extension sessions are read-oriented. Value-moving operations remain
      // an App + wallet-signature responsibility.
      scopes: EXTENSION_SCOPES,
    })
  })
}
