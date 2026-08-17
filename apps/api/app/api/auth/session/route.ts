import { handle, json, preflight } from "@/lib/http"
import { readSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

export function GET(request: Request) {
  return handle(request, async () => {
    const session = await readSession(request)
    return json(request, {
      authenticated: session !== null,
      wallet: session?.address ?? null,
    })
  })
}
