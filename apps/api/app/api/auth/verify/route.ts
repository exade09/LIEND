import { AuthVerifyRequestSchema } from "@liend/domain"
import { verifyWalletSignature } from "@/lib/crypto"
import { ApiFailure, handle, json, preflight, readJson } from "@/lib/http"
import { createSession } from "@/lib/session"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

/**
 * Verifies a wallet signature and creates a session.
 *
 * Order matters: the challenge is consumed atomically BEFORE the signature is
 * checked, so a failed or concurrent attempt cannot retry the same nonce.
 */
export function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (value) => AuthVerifyRequestSchema.safeParse(value))
    const store = getStore()

    const challenge = await store.findChallenge(body.nonce)
    if (!challenge) throw new ApiFailure("unauthorized", "Challenge not found or already used")

    // Bind the challenge to the wallet that requested it.
    if (challenge.address !== body.address) {
      throw new ApiFailure("unauthorized", "Challenge does not match this wallet")
    }

    const consumed = await store.consumeChallenge(body.nonce, Date.now())
    if (!consumed) throw new ApiFailure("unauthorized", "Challenge expired or already used")

    const valid = await verifyWalletSignature(body.address, challenge.message, body.signature)
    if (!valid) throw new ApiFailure("unauthorized", "Signature verification failed")

    const { cookie } = await createSession(body.address)
    return json(request, { authenticated: true, wallet: body.address }, 200, { "set-cookie": cookie })
  })
}
