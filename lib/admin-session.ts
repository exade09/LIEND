import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export const ADMIN_COOKIE = "liend_admin"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

function configuredPassword(): string | null {
  const password = process.env.LIEND_ADMIN_PASSWORD?.trim()
  return password || null
}

function secret(): string | null {
  const password = configuredPassword()
  if (!password) return null
  return process.env.LIEND_ADMIN_SECRET?.trim() || password
}

export function isAdminConfigured(): boolean {
  return Boolean(configuredPassword())
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function passwordMatches(candidate: string): boolean {
  const expected = configuredPassword()
  if (!expected) return false
  return safeEqual(candidate, expected)
}

function hmac(value: string): string {
  const key = secret()
  if (!key) return ""
  return createHmac("sha256", key).update(value).digest("base64url")
}

export function signAdminSession(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const nonce = randomBytes(16).toString("base64url")
  const payload = `v1.${expiresAt}.${nonce}`
  return `${payload}.${hmac(payload)}`
}

export function readAdminSession(cookieValue: string | null): boolean {
  if (!cookieValue || !secret()) return false
  const decoded = decodeURIComponent(cookieValue)
  const separator = decoded.lastIndexOf(".")
  if (separator <= 0) return false
  const payload = decoded.slice(0, separator)
  const tag = decoded.slice(separator + 1)
  const expected = hmac(payload)
  if (!expected || !safeEqual(tag, expected)) return false
  const parts = payload.split(".")
  const expiresAt = Number(parts[1])
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return rest.join("=")
  }
  return null
}

export function isAdminRequest(request: Request): boolean {
  return readAdminSession(readCookie(request, ADMIN_COOKIE))
}

function cookieFlags(): string {
  const parts = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_TTL_MS / 1000}`]
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) parts.push("Secure")
  return parts.join("; ")
}

export function buildAdminCookie(value: string): string {
  return `${ADMIN_COOKIE}=${value}; ${cookieFlags()}`
}

export function clearAdminCookie(): string {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL ? "; Secure" : ""
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

const loginBuckets = new Map<string, { count: number; resetAt: number }>()

export function allowLoginAttempt(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const existing = loginBuckets.get(ip)
  if (!existing || existing.resetAt <= now) {
    loginBuckets.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  existing.count += 1
  return existing.count <= 8
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}
