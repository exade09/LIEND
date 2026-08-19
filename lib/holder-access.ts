/**
 * Presentation lookup for the landing ACCESS GATE.
 *
 * The landing never invents eligibility. It asks the same-origin BFF, which
 * either proxies the LIEND API or reports the truthful pre-launch state.
 */

export type HolderAccessDto =
  | { state: "disconnected" }
  | { state: "token-not-launched"; wallet: string }
  | { state: "holder-check-pending"; wallet: string; mint: string }
  | {
      state: "not-eligible"
      wallet: string
      mint: string
      balance: string
      required: string | null
      amount?: string | null
    }
  | {
      state: "eligible"
      wallet: string
      mint: string
      balance: string
      required: string | null
      amount?: string | null
    }
  | { state: "error"; wallet: string | null; reason: string }

const ACCESS_STATES = new Set([
  "disconnected",
  "token-not-launched",
  "holder-check-pending",
  "not-eligible",
  "eligible",
  "error",
])

function asAccess(value: unknown): HolderAccessDto | null {
  if (!value || typeof value !== "object") return null
  const state = (value as { state?: unknown }).state
  if (typeof state !== "string" || !ACCESS_STATES.has(state)) return null
  return value as HolderAccessDto
}

export async function fetchHolderAccess(wallet: string): Promise<HolderAccessDto> {
  let response: Response
  try {
    response = await fetch(`/api/holder-check?wallet=${encodeURIComponent(wallet)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    })
  } catch {
    return { state: "error", wallet, reason: "LIEND access could not be verified" }
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    return { state: "error", wallet, reason: "LIEND access could not be verified" }
  }

  const access = asAccess(body)
  if (access) return access

  const message =
    body && typeof body === "object" && "error" in body
      ? (body as { error?: { message?: string } }).error?.message
      : undefined
  return {
    state: "error",
    wallet,
    reason: message || "LIEND access could not be verified",
  }
}

export function accessCopy(access: HolderAccessDto): string {
  switch (access.state) {
    case "disconnected":
      return "Connect a Solana wallet to begin the eligibility check"
    case "token-not-launched":
      return "LIEND utility is available for this wallet"
    case "holder-check-pending":
      return "Checking LIEND balance and active access parameters"
    case "not-eligible":
      return access.required === null
        ? "The LIEND holding requirement has not been published yet"
        : "This wallet does not meet the LIEND holding requirement"
    case "eligible":
      return "This wallet meets the LIEND holding requirement"
    case "error":
      return access.reason
  }
}

export function accessBalanceLabel(access: HolderAccessDto): string {
  if (access.state === "eligible" || access.state === "not-eligible") {
    if (access.amount) return access.amount
    return access.balance === "0" ? "0" : "held"
  }
  return "--"
}
