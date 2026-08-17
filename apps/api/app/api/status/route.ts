import { handle, json, preflight } from "@/lib/http"
import { readServerEnv } from "@/lib/env"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Safe, unauthenticated product status.
 *
 * Exposes only whether infrastructure exists — never a secret, and never an
 * invented value. The App uses this to render truthful pre-launch states.
 */
export function GET(request: Request) {
  return handle(request, async () => {
    const token = readServerEnv().token
    const launched = token.status === "launched"
    return json(request, {
      tokenLaunched: launched,
      mint: token.status === "launched" ? token.mint : null,
      holderRequirementPublished: token.status === "launched" && token.minimumBalance !== null,
      // No on-chain lending program exists yet; execution stays unavailable.
      executionAdapterAvailable: false,
    })
  })
}
