import { handle, json, preflight } from "@/lib/http"
import { requireSession } from "@/lib/session"
import { readSessionPositions } from "@/lib/wallet-positions"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export function OPTIONS(request: Request) {
  return preflight(request)
}

/** On-chain ERC-20 balances for the authenticated Robinhood Chain wallet. */
export function GET(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request)
    const positions = await readSessionPositions(session.address)
    return json(request, positions)
  })
}
