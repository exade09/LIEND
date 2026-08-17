import { handle, json, preflight } from "@/lib/http"
import { readSession } from "@/lib/session"
import { resolveUtilityAccess, toDto } from "@/lib/utility-access"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

/** Server-derived access. The client never computes this for authorization. */
export function GET(request: Request) {
  return handle(request, async () => {
    const session = await readSession(request)
    const access = await resolveUtilityAccess(session?.address ?? null)
    return json(request, toDto(access))
  })
}
