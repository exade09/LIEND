import { ApiFailure, handle, json, preflight } from "@/lib/http"
import { requireSession } from "@/lib/session"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ requestId: string }> }

export function OPTIONS(request: Request) { return preflight(request) }

export function POST(request: Request, ctx: Ctx) {
  return handle(request, async () => {
    await requireSession(request)
    const { requestId } = await ctx.params

    const ok = await getStore().rejectPairing(requestId, Date.now())
    if (!ok) throw new ApiFailure("conflict", "Pairing request is expired or no longer pending")

    return json(request, { requestId, status: "rejected" })
  })
}
