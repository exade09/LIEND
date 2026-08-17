/**
 * Public origins for every LIEND surface.
 *
 * Nothing here is hardcoded to a domain. The values arrive from environment
 * variables so that moving from Vercel-generated URLs to a future custom
 * domain is a configuration change plus a rebuild — never a code change.
 *
 * Read this file before adding any URL anywhere else in the codebase. If a
 * URL is not resolvable from here, it does not belong in product code.
 */

/** Which deployment this build is running as. */
export type DeploymentEnvironment = "development" | "preview" | "production"

export type Origins = {
  /** Marketing landing. */
  landing: string
  /** LIEND App (positions, borrow, loans). */
  app: string
  /** LIEND API. */
  api: string
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

/**
 * Normalises and validates an absolute origin.
 * Returns null for empty/unset values so callers can render a truthful
 * "not configured yet" state instead of a broken link.
 */
export function parseOrigin(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return trimTrailingSlash(url.origin + (url.pathname === "/" ? "" : url.pathname))
  } catch {
    return null
  }
}

/**
 * Resolves the deployment environment.
 *
 * VERCEL_ENV is set by Vercel to "production" | "preview" | "development".
 * We never infer trust from a hostname suffix such as `.vercel.app` — see
 * `resolveAllowedOrigins`, which requires explicit configuration.
 */
export function resolveEnvironment(raw: string | undefined): DeploymentEnvironment {
  if (raw === "production") return "production"
  if (raw === "preview") return "preview"
  return "development"
}

/**
 * Server-side CORS allowlist.
 *
 * Deliberately explicit: an origin is trusted only if it appears in
 * LIEND_ALLOWED_ORIGINS. We do not pattern-match `*.vercel.app`, because any
 * user can deploy a project on that suffix and would otherwise inherit trust
 * against an authenticated financial API.
 */
export function resolveAllowedOrigins(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((entry) => parseOrigin(entry))
    .filter((entry): entry is string => entry !== null)
}
