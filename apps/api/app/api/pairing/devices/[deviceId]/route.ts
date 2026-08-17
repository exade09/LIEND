import { ApiFailure, handle, json, preflight } from "@/lib/http"
import { requireSession } from "@/lib/session"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ deviceId: string }> }

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Revokes a paired browser.
 *
 * Ownership is enforced inside the SQL predicate, so an authenticated user
 * cannot revoke another wallet's device. Revoking cascades to every extension
 * session derived from that device.
 */
export function DELETE(request: Request, ctx: Ctx) {
  return handle(request, async () => {
    const session = await requireSession(request)
    const { deviceId } = await ctx.params

    const revoked = await getStore().revokeDevice(session.address, deviceId, Date.now())
    if (!revoked) throw new ApiFailure("not_found", "Device not found")

    return json(request, { deviceId, status: "revoked" })
  })
}
