/**
 * Device identity and API session.
 *
 * Two secrets, matching the Phase 3A backend design:
 *
 *  - DEVICE CREDENTIAL — long-lived, issued once at pairing exchange. Stored
 *    in `chrome.storage.local` because it must survive a browser restart;
 *    that is what makes "no re-pairing after restart" possible. It grants no
 *    data on its own — it can only mint a session.
 *
 *  - ACCESS TOKEN — short-lived (1h). Stored in `chrome.storage.session`,
 *    which Chrome does NOT expose to content scripts by default. We never
 *    widen that with `setAccessLevel`.
 *
 * Neither ever reaches the content script or the page. No wallet key, seed
 * phrase or App cookie is stored anywhere in the extension.
 */

import { API_URL } from "./config"

const CREDENTIAL_KEY = "liend.deviceCredential"
const DEVICE_ID_KEY = "liend.deviceId"
const TOKEN_KEY = "liend.accessToken"
const TOKEN_EXPIRY_KEY = "liend.accessTokenExpiresAt"

export type DeviceIdentity = { credential: string; deviceId: string }

export async function readDeviceIdentity(): Promise<DeviceIdentity | null> {
  const stored = await chrome.storage.local.get([CREDENTIAL_KEY, DEVICE_ID_KEY])
  const credential = stored[CREDENTIAL_KEY]
  const deviceId = stored[DEVICE_ID_KEY]
  if (typeof credential !== "string" || typeof deviceId !== "string") return null
  return { credential, deviceId }
}

export async function saveDeviceIdentity(identity: DeviceIdentity): Promise<void> {
  await chrome.storage.local.set({
    [CREDENTIAL_KEY]: identity.credential,
    [DEVICE_ID_KEY]: identity.deviceId,
  })
}

/** Full local wipe — used on disconnect and when the server reports revocation. */
export async function clearDeviceIdentity(): Promise<void> {
  await chrome.storage.local.remove([CREDENTIAL_KEY, DEVICE_ID_KEY])
  await chrome.storage.session.remove([TOKEN_KEY, TOKEN_EXPIRY_KEY])
}

async function readCachedToken(): Promise<string | null> {
  const stored = await chrome.storage.session.get([TOKEN_KEY, TOKEN_EXPIRY_KEY])
  const token = stored[TOKEN_KEY]
  const expiresAt = stored[TOKEN_EXPIRY_KEY]
  if (typeof token !== "string" || typeof expiresAt !== "number") return null
  // Refresh a minute early so a request never races the expiry.
  return expiresAt - 60_000 > Date.now() ? token : null
}

export class DeviceRevokedError extends Error {
  constructor() {
    super("This browser connection was revoked")
    this.name = "DeviceRevokedError"
  }
}

/**
 * Returns a valid short-lived access token, minting a new one from the device
 * credential when needed. This is what reconstructs paired state after a
 * browser restart or a service-worker termination.
 */
export async function getAccessToken(): Promise<string | null> {
  const cached = await readCachedToken()
  if (cached) return cached

  const identity = await readDeviceIdentity()
  if (!identity) return null

  const response = await fetch(`${API_URL}/api/extension/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${identity.credential}`, accept: "application/json" },
  })

  if (response.status === 401) {
    // The server no longer recognises this device: revoked, or the database
    // was reset. Either way the local identity is worthless — drop it.
    await clearDeviceIdentity()
    throw new DeviceRevokedError()
  }
  if (!response.ok) return null

  const body = (await response.json()) as { accessToken?: unknown; expiresAt?: unknown }
  if (typeof body.accessToken !== "string" || typeof body.expiresAt !== "number") return null

  await chrome.storage.session.set({
    [TOKEN_KEY]: body.accessToken,
    [TOKEN_EXPIRY_KEY]: body.expiresAt,
  })
  return body.accessToken
}

/**
 * Authenticated API call. The only place an access token is attached, and it
 * never leaves this module.
 */
export async function apiFetch(path: string): Promise<Response | null> {
  const token = await getAccessToken()
  if (!token) return null
  return fetch(`${API_URL}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  })
}
