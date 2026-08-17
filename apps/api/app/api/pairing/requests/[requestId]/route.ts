import { ApiFailure, handle, json, preflight } from "@/lib/http"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ requestId: string }> }

export function OPTIONS(request: Request) { return preflight(request) }

/** Reads pairing status. Never returns the issued token or the approver. */
export function GET(request: Request, ctx: Ctx) {
  return handle(request, async () => {
    const { requestId } = await ctx.params
    const record = await getStore().findPairing(requestId)
    if (!record) throw new ApiFailure("not_found", "Pairing request not found")

    const expired = record.expiresAt <= Date.now() && record.status === "pending"
    return json(request, {
      requestId: record.requestId,
      userCode: record.userCode,
      expiresAt: record.expiresAt,
      status: expired ? "expired" : record.status,
    })
  })
}
