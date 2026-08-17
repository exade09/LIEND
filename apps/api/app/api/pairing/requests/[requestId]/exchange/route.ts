import { z } from "zod"
import { randomId } from "@/lib/crypto"
import { issueDeviceCredential } from "@/lib/device-auth"
import { ApiFailure, handle, json, preflight, readJson } from "@/lib/http"
import { getRateLimiter, RATE_LIMITS } from "@/lib/rate-limit"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ requestId: string }> }

const BodySchema = z.object({
  label: z.string().trim().min(1).max(64).default("Chrome"),
  extensionVersion: z.string().trim().max(32).nullable().default(null),
})

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Exchanges an APPROVED pairing request for a device credential, exactly once.
 *
 * Called by the future extension. Unauthenticated by design: possession of the
 * requestId plus a prior authenticated approval is the proof. The store
 * consumes the request and creates the device in one atomic step, so a replay
 * finds nothing to consume and no second device is ever issued.
 *
 * The credential is returned here and never again — only its hash is stored.
 */
export function POST(request: Request, ctx: Ctx) {
  return handle(request, async () => {
    const { requestId } = await ctx.params

    const budget = RATE_LIMITS.pairingExchange
    const limit = await getRateLimiter().check(`exchange:${requestId}`, budget.limit, budget.windowMs)
    if (!limit.allowed) throw new ApiFailure("rate_limited", "Too many exchange attempts")

    const body = await readJson(request, (value) => BodySchema.safeParse(value))
    const { credential, hash } = issueDeviceCredential()
    const deviceId = randomId(16)

    const result = await getStore().consumePairingAndCreateDevice({
      requestId,
      now: Date.now(),
      credentialHash: hash,
      device: {
        deviceId,
        address: "",
        label: body.label,
        extensionVersion: body.extensionVersion,
        createdAt: Date.now(),
        lastSeenAt: null,
        revokedAt: null,
      },
    })

    if (!result.ok) {
      throw new ApiFailure("conflict", "Pairing request is not approved, or was already used")
    }

    return json(request, { deviceId, deviceCredential: credential })
  })
}
