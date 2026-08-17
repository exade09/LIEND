/**
 * HTTP helpers: typed errors and explicit-origin CORS.
 *
 * CORS policy, stated once so it cannot drift:
 *  - Never `Access-Control-Allow-Origin: *` on an authenticated API.
 *  - An origin is allowed only if it appears in LIEND_ALLOWED_ORIGINS.
 *  - We do NOT trust an origin because it ends in `.vercel.app`; anyone can
 *    deploy there and would otherwise inherit access to a financial API.
 *  - Future Chrome extension origins (`chrome-extension://<id>`) are added to
 *    the same allowlist once the ID is fixed — no code change required.
 */

import type { ApiErrorCode } from "@liend/domain"
import { readServerEnv } from "./env"

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  utility_locked: 403,
  token_not_launched: 409,
  adapter_unavailable: 503,
  internal: 500,
}

export class ApiFailure extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ApiFailure"
  }
}

/** Returns the echo-back origin, or null when the request origin is not allowed. */
export function resolveCorsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin")
  if (!origin) return null
  const { allowedOrigins } = readServerEnv()
  return allowedOrigins.includes(origin) ? origin : null
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = resolveCorsOrigin(request)
  if (!origin) return {}
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    vary: "origin",
  }
}

export function json(request: Request, body: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...corsHeaders(request),
      ...Object.fromEntries(new Headers(extra).entries()),
    },
  })
}

export function fail(request: Request, code: ApiErrorCode, message: string): Response {
  return json(request, { error: { code, message } }, STATUS_BY_CODE[code])
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) })
}

/**
 * Wraps a handler so thrown ApiFailures become typed responses and anything
 * else becomes a generic 500. Internal messages are never leaked to clients.
 */
export function handle(
  request: Request,
  fn: () => Promise<Response>,
): Promise<Response> {
  return fn().catch((error: unknown) => {
    if (error instanceof ApiFailure) return fail(request, error.code, error.message)
    console.error("[liend-api] unhandled error", error)
    return fail(request, "internal", "Unexpected server error")
  })
}

/** Parses and validates a JSON body, throwing a typed 400 on any mismatch. */
export async function readJson<T>(
  request: Request,
  parse: (value: unknown) => { success: true; data: T } | { success: false },
): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new ApiFailure("bad_request", "Request body must be valid JSON")
  }
  const result = parse(raw)
  if (!result.success) throw new ApiFailure("bad_request", "Request body failed validation")
  return result.data
}
