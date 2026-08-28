import { project } from "@/config/project"
import { isLikelySolanaAddress } from "@/lib/addresses"

export const dynamic = "force-dynamic"

/**
 * Same-origin BFF for the landing ACCESS GATE.
 *
 * Proxies the LIEND API when configured so the browser does not depend on
 * CORS. Before a mint exists, reports the real pre-launch state locally.
 */
export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet")?.trim() ?? ""
  if (!isLikelySolanaAddress(wallet)) {
    return Response.json(
      { error: { code: "bad_request", message: "A valid Solana wallet address is required" } },
      { status: 400, headers: { "cache-control": "no-store" } },
    )
  }

  const apiUrl = project.apiUrl
  if (apiUrl) {
    try {
      const upstream = await fetch(
        `${apiUrl}/api/holder-check?wallet=${encodeURIComponent(wallet)}`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      )
      const text = await upstream.text()
      let body: unknown = null
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = null
        }
      }
      if (body && typeof body === "object") {
        return Response.json(body, {
          status: upstream.status,
          headers: { "cache-control": "no-store" },
        })
      }
    } catch {
      // Fall through to the local pre-launch answer when the API is unreachable.
    }
  }

  if (!project.token.launched) {
    return Response.json(
      { state: "token-not-launched", wallet },
      { headers: { "cache-control": "no-store" } },
    )
  }

  return Response.json(
    { state: "error", wallet, reason: "STAYFI access could not be verified" },
    { headers: { "cache-control": "no-store" } },
  )
}
