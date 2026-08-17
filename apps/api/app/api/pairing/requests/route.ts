import { randomId, randomUserCode } from "@/lib/crypto"
import { ApiFailure, handle, json, preflight } from "@/lib/http"
import { getRateLimiter, RATE_LIMITS } from "@/lib/rate-limit"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

const PAIRING_TTL_MS = 1000 * 60 * 5

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Creates a pairing request. Called by the future extension BEFORE any user
 * is authenticated, so this endpoint is intentionally unauthenticated.
 *
 * `requestId` is opaque and is not a credential: it grants nothing until an
 * authenticated user explicitly approves it, and it can be exchanged once.
 */
export function POST(request: Request) {
  return handle(request, async () => {
    const budget = RATE_LIMITS.pairingCreate
    const limit = await getRateLimiter().check("pairing:create", budget.limit, budget.windowMs)
    if (!limit.allowed) throw new ApiFailure("rate_limited", "Too many pairing requests")

    const now = Date.now()
    const requestId = randomId()
    const userCode = randomUserCode()

    await getStore().createPairing({
      requestId,
      userCode,
      approvedBy: null,
      status: "pending",
      createdAt: now,
      expiresAt: now + PAIRING_TTL_MS,
      consumedAt: null,
      deviceId: null,
    })

    return json(request, { requestId, userCode, expiresAt: now + PAIRING_TTL_MS, status: "pending" })
  })
}
