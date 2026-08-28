import { AuthChallengeRequestSchema } from "@liend/domain"
import { randomId } from "@/lib/crypto"
import { ApiFailure, handle, json, preflight, readJson } from "@/lib/http"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

const CHALLENGE_TTL_MS = 1000 * 60 * 5

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Issues a single-use challenge for the given wallet.
 *
 * The message is human-readable because the wallet displays it verbatim to
 * the user before signing — the user must be able to see what they approve.
 * It binds the nonce and the address so a signature cannot be replayed for a
 * different wallet or a different challenge.
 */
export function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (value) => AuthChallengeRequestSchema.safeParse(value))
    const nonce = randomId()
    const issuedAt = new Date().toISOString()
    const message = [
      "LONS authentication",
      "",
      "Sign this message to prove you control this wallet",
      "This request will not create a transaction and costs no fees",
      "",
      `Wallet: ${body.address}`,
      "Network: Robinhood Chain (4663)",
      `Nonce: ${nonce}`,
      `Issued: ${issuedAt}`,
    ].join("\n")

    const expiresAt = Date.now() + CHALLENGE_TTL_MS

    try {
      await getStore().createChallenge({
        nonce,
        address: body.address,
        message,
        expiresAt,
        consumedAt: null,
      })
    } catch {
      throw new ApiFailure("adapter_unavailable", "Authentication storage is not configured")
    }

    return json(request, { nonce, message, expiresAt })
  })
}
