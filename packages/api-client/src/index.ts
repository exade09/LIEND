/**
 * Typed LIEND API client.
 *
 * Shared by the App today and usable by the future Extension service worker.
 *
 * Two invariants:
 *  1. The base URL is injected by the caller from configuration. There is no
 *     localhost, Vercel URL or future domain anywhere in this file.
 *  2. Every response is parsed with a runtime schema before it is returned.
 *     A response that does not match the contract becomes an error, never a
 *     partially-trusted object.
 */

import { z } from "zod"
import {
  ApiErrorSchema,
  AuthChallengeSchema,
  ExtensionDeviceSchema,
  PairingRequestSchema,
  UtilityAccessSchema,
  WalletPositionsResponseSchema,
  type ApiErrorCode,
} from "@liend/domain"

export class LiendApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly requestId?: string

  constructor(code: ApiErrorCode, message: string, status: number, requestId?: string) {
    super(message)
    this.name = "LiendApiError"
    this.code = code
    this.status = status
    this.requestId = requestId
  }
}

export type LiendApiClientOptions = {
  /** Absolute API origin, from configuration. Required — no default. */
  baseUrl: string
  /**
   * Sends session cookies. The App uses `include` so the HttpOnly session
   * cookie is attached; the Extension will pass an explicit Authorization
   * header instead and leave this as `omit`.
   */
  credentials?: RequestCredentials
  /** Extension session token. Never used by the App. */
  bearerToken?: string | null
  fetchImpl?: typeof fetch
}

const HealthSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  environment: z.enum(["development", "preview", "production"]),
})

const PublicStatusSchema = z.object({
  tokenLaunched: z.boolean(),
  /** Present only once the token exists. */
  mint: z.string().nullable(),
  holderRequirementPublished: z.boolean(),
  executionAdapterAvailable: z.boolean(),
})

const SessionSchema = z.object({
  authenticated: z.boolean(),
  wallet: z.string().nullable(),
})

export function createLiendApiClient(options: LiendApiClientOptions) {
  const { baseUrl, credentials = "include", bearerToken = null } = options
  const doFetch = options.fetchImpl ?? globalThis.fetch

  if (!baseUrl) {
    throw new Error("createLiendApiClient: baseUrl is required and must come from configuration")
  }

  const root = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set("accept", "application/json")
    if (init?.body) headers.set("content-type", "application/json")
    if (bearerToken) headers.set("authorization", `Bearer ${bearerToken}`)

    let response: Response
    try {
      response = await doFetch(`${root}${path}`, { ...init, headers, credentials })
    } catch {
      throw new LiendApiError("internal", "Could not reach the LIEND API", 0)
    }

    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        throw new LiendApiError("internal", "Malformed response from the LIEND API", response.status)
      }
    }

    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(body)
      if (parsed.success) {
        throw new LiendApiError(
          parsed.data.error.code,
          parsed.data.error.message,
          response.status,
          parsed.data.error.requestId,
        )
      }
      throw new LiendApiError("internal", `Request failed (${response.status})`, response.status)
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      // Contract drift is an error, not something to render partially.
      throw new LiendApiError("internal", "Unexpected response shape from the LIEND API", response.status)
    }
    return parsed.data
  }

  return {
    health: () => request("/api/health", HealthSchema),

    /** Safe, unauthenticated product status. Drives pre-launch UI truthfully. */
    publicStatus: () => request("/api/status", PublicStatusSchema),

    session: () => request("/api/auth/session", SessionSchema),

    authChallenge: (address: string, cluster: string) =>
      request("/api/auth/challenge", AuthChallengeSchema, {
        method: "POST",
        body: JSON.stringify({ address, cluster }),
      }),

    authVerify: (address: string, nonce: string, signature: string) =>
      request("/api/auth/verify", SessionSchema, {
        method: "POST",
        body: JSON.stringify({ address, nonce, signature }),
      }),

    logout: () => request("/api/auth/logout", z.object({ ok: z.literal(true) }), { method: "POST" }),

    /** Server-derived utility access. The client never computes this itself. */
    utilityAccess: () => request("/api/utility-access", UtilityAccessSchema),

    /** On-chain SPL token accounts for the authenticated session wallet. */
    walletPositions: () => request("/api/positions", WalletPositionsResponseSchema),

    createPairingRequest: () =>
      request("/api/pairing/requests", PairingRequestSchema, { method: "POST" }),

    getPairingRequest: (requestId: string) =>
      request(`/api/pairing/requests/${encodeURIComponent(requestId)}`, PairingRequestSchema),

    listDevices: () =>
      request("/api/pairing/devices", z.object({ devices: z.array(ExtensionDeviceSchema) })),

    /** Revokes a paired browser. Ownership is enforced server-side. */
    revokeDevice: (deviceId: string) =>
      request(
        `/api/pairing/devices/${encodeURIComponent(deviceId)}`,
        z.object({ deviceId: z.string(), status: z.literal("revoked") }),
        { method: "DELETE" },
      ),
  }
}

export type LiendApiClient = ReturnType<typeof createLiendApiClient>
