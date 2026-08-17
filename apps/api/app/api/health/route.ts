import { handle, json, preflight } from "@/lib/http"
import { readServerEnv } from "@/lib/env"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

export function GET(request: Request) {
  return handle(request, async () => {
    const env = readServerEnv()
    return json(request, { status: "ok", version: env.version, environment: env.environment })
  })
}
