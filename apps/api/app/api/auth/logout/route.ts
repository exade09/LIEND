import { handle, json, preflight } from "@/lib/http"
import { clearSessionCookie, readSession } from "@/lib/session"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

export function POST(request: Request) {
  return handle(request, async () => {
    const session = await readSession(request)
    if (session) await getStore().revokeSession(session.sessionId)
    return json(request, { ok: true }, 200, { "set-cookie": clearSessionCookie() })
  })
}
