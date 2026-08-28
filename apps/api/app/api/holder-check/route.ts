import { EvmAddress } from "@liend/domain"
import { ApiFailure, handle, json, preflight } from "@/lib/http"
import { readServerEnv } from "@/lib/env"
import { readWalletTokenAccounts } from "@/lib/evm-rpc"
import { resolveUtilityAccess, toDto } from "@/lib/utility-access"
import { formatTokenAmount } from "@/lib/wallet-positions"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) {
  return preflight(request)
}

/**
 * Unauthenticated holder preview for a public wallet address.
 *
 * On-chain token balances are already public. This endpoint reuses the same
 * server-side `resolveUtilityAccess` path as the authenticated gate, so the
 * landing CRT cannot invent eligibility. It does not create a session.
 */
export function GET(request: Request) {
  return handle(request, async () => {
    const raw = new URL(request.url).searchParams.get("wallet")
    const parsed = EvmAddress.safeParse(raw)
    if (!parsed.success) {
      throw new ApiFailure("bad_request", "A valid EVM wallet address is required")
    }

    const wallet = parsed.data
    const access = await resolveUtilityAccess(wallet)
    const dto = toDto(access)

    let amount: string | null = null
    if (access.state === "eligible" || access.state === "not-eligible") {
      if (access.balance === 0n) {
        amount = "0"
      } else {
        const env = readServerEnv()
        if (env.token.status === "launched") {
          const mint = env.token.mint
          try {
            const accounts = await readWalletTokenAccounts(wallet)
            const match = accounts.find((account) => account.mint.toLowerCase() === mint.toLowerCase())
            amount = match ? formatTokenAmount(match.amountRaw, match.decimals) : "held"
          } catch {
            amount = "held"
          }
        }
      }
    }

    return json(request, { ...dto, amount })
  })
}
