/**
 * Pairing flow (extension side).
 *
 * Mirrors the Phase 3A backend state machine:
 *   create request -> open App /pair -> user authenticates and approves
 *   -> extension exchanges once -> device credential issued.
 *
 * The URL opened in the App carries ONLY the opaque request id. It is not a
 * credential and grants nothing without an authenticated approval. The user
 * code is displayed in the panel so it can be compared against the App — that
 * comparison is the anti-phishing control.
 */

import { API_URL, APP_URL } from "./config"
import { saveDeviceIdentity } from "./session"

const PAIRING_KEY = "liend.pairing"
/** Server expiry is 5 minutes; stop polling a little before that. */
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 4 * 60 * 1000

export type PairingState = { requestId: string; userCode: string; expiresAt: number } | null

export async function readPairing(): Promise<PairingState> {
  const stored = await chrome.storage.session.get(PAIRING_KEY)
  const value = stored[PAIRING_KEY]
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (
    typeof record.requestId !== "string" ||
    typeof record.userCode !== "string" ||
    typeof record.expiresAt !== "number"
  ) {
    return null
  }
  return { requestId: record.requestId, userCode: record.userCode, expiresAt: record.expiresAt }
}

async function writePairing(state: PairingState): Promise<void> {
  if (state) await chrome.storage.session.set({ [PAIRING_KEY]: state })
  else await chrome.storage.session.remove(PAIRING_KEY)
}

export async function cancelPairing(): Promise<void> {
  await writePairing(null)
}

/** Creates a request and opens the App approval screen in a new tab. */
export async function startPairing(): Promise<NonNullable<PairingState>> {
  const response = await fetch(`${API_URL}/api/pairing/requests`, {
    method: "POST",
    headers: { accept: "application/json" },
  })
  if (!response.ok) throw new Error("Could not start pairing")

  const body = (await response.json()) as Record<string, unknown>
  if (
    typeof body.requestId !== "string" ||
    typeof body.userCode !== "string" ||
    typeof body.expiresAt !== "number"
  ) {
    throw new Error("Unexpected pairing response")
  }

  const state: NonNullable<PairingState> = {
    requestId: body.requestId,
    userCode: body.userCode,
    expiresAt: body.expiresAt,
  }
  await writePairing(state)

  const url = new URL(`${APP_URL}/pair`)
  url.searchParams.set("request", state.requestId)
  await chrome.tabs.create({ url: url.toString() })

  return state
}

type PollOutcome =
  | { outcome: "paired" }
  | { outcome: "rejected" }
  | { outcome: "expired" }
  | { outcome: "cancelled" }
  | { outcome: "error"; message: string }

/**
 * Polls for approval, then exchanges exactly once.
 *
 * Polling (rather than a push channel) is used because the approval happens in
 * a different browsing context on a different origin; there is no event Chrome
 * can deliver here. It is bounded by the request's own expiry, so it is not an
 * open-ended background loop.
 */
export async function awaitApproval(
  requestId: string,
  onProgress: () => void,
): Promise<PollOutcome> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const current = await readPairing()
    if (!current || current.requestId !== requestId) return { outcome: "cancelled" }

    let status: string
    try {
      const response = await fetch(
        `${API_URL}/api/pairing/requests/${encodeURIComponent(requestId)}`,
        { headers: { accept: "application/json" } },
      )
      if (response.status === 404) return { outcome: "expired" }
      if (!response.ok) throw new Error("lookup failed")
      status = String((await response.json()).status)
    } catch {
      return { outcome: "error", message: "Could not reach the LIEND API" }
    }

    if (status === "rejected") {
      await writePairing(null)
      return { outcome: "rejected" }
    }
    if (status === "expired" || status === "consumed") {
      await writePairing(null)
      return { outcome: "expired" }
    }

    if (status === "approved") {
      const exchanged = await exchange(requestId)
      await writePairing(null)
      return exchanged
    }

    onProgress()
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  await writePairing(null)
  return { outcome: "expired" }
}

async function exchange(requestId: string): Promise<PollOutcome> {
  try {
    const response = await fetch(
      `${API_URL}/api/pairing/requests/${encodeURIComponent(requestId)}/exchange`,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          // Privacy-conscious: a generic label and the extension version.
          // No fingerprint, no user agent, no browsing data.
          label: "Chrome",
          extensionVersion: chrome.runtime.getManifest().version,
        }),
      },
    )
    if (!response.ok) return { outcome: "expired" }

    const body = (await response.json()) as Record<string, unknown>
    if (typeof body.deviceCredential !== "string" || typeof body.deviceId !== "string") {
      return { outcome: "error", message: "Unexpected pairing response" }
    }

    await saveDeviceIdentity({ credential: body.deviceCredential, deviceId: body.deviceId })
    return { outcome: "paired" }
  } catch {
    return { outcome: "error", message: "Could not complete pairing" }
  }
}
