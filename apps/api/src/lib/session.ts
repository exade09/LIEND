/**
 * Session handling.
 *
 * A session is an opaque id plus an HMAC tag, stored in an HttpOnly cookie.
 * The cookie carries no wallet address and no claims — the server resolves
 * everything from the store, so a client cannot forge or edit its identity.
 *
 * The cookie is domain-agnostic (host-only). Nothing here is tied to a
 * Vercel URL or a future custom domain, so migration needs no code change.
 */

import { hmac, randomId, safeEqual } from "./crypto"
import { readServerEnv } from "./env"
import { getStore } from "./store"
import { ApiFailure } from "./http"

export const SESSION_COOKIE = "liend_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

function requireSecret(): string {
  const { sessionSecret, isProduction } = readServerEnv()
  if (sessionSecret) return sessionSecret
  if (isProduction) {
    throw new ApiFailure("internal", "Session secret is not configured")
  }
  // Development only: a stable, obviously non-secret value so local work does
  // not require setup. Production takes the branch above and fails loudly.
  return "liend-development-session-secret-not-for-production"
}

function sign(sessionId: string): string {
  return `${sessionId}.${hmac(requireSecret(), sessionId)}`
}

function unsign(value: string): string | null {
  const separator = value.lastIndexOf(".")
  if (separator <= 0) return null
  const sessionId = value.slice(0, separator)
  const tag = value.slice(separator + 1)
  return safeEqual(tag, hmac(requireSecret(), sessionId)) ? sessionId : null
}

export function buildSessionCookie(sessionId: string, maxAgeSeconds: number): string {
  const { isProduction } = readServerEnv()
  const parts = [
    `${SESSION_COOKIE}=${sign(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=None",
    `Max-Age=${maxAgeSeconds}`,
  ]
  // SameSite=None requires Secure. The App and API are separate origins, so
  // the session cookie is inherently cross-site and must be sent this way.
  if (isProduction || true) parts.push("Secure")
  return parts.join("; ")
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return rest.join("=")
  }
  return null
}

export async function createSession(address: string): Promise<{ cookie: string }> {
  const sessionId = randomId()
  const now = Date.now()
  await getStore().createSession({
    sessionId,
    address,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    revokedAt: null,
  })
  return { cookie: buildSessionCookie(sessionId, SESSION_TTL_MS / 1000) }
}

/** Resolves the authenticated wallet, or null. Never throws on absence. */
export async function readSession(request: Request): Promise<{ sessionId: string; address: string } | null> {
  const raw = readCookie(request, SESSION_COOKIE)
  if (!raw) return null

  const sessionId = unsign(decodeURIComponent(raw))
  if (!sessionId) return null

  const record = await getStore().findSession(sessionId)
  if (!record) return null
  if (record.revokedAt !== null) return null
  if (record.expiresAt <= Date.now()) return null

  return { sessionId, address: record.address }
}

/** Use in handlers that require authentication. */
export async function requireSession(request: Request): Promise<{ sessionId: string; address: string }> {
  const session = await readSession(request)
  if (!session) throw new ApiFailure("unauthorized", "Authentication required")
  return session
}
