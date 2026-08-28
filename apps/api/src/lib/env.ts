/**
 * Server environment for the LIEND API.
 *
 * Every value is read from the environment and validated at first use. No
 * origin, mint or threshold is hardcoded, so moving from Vercel-generated
 * URLs to a future custom domain is an env change plus a redeploy.
 */

import {
  resolveAllowedOrigins,
  resolveEnvironment,
  resolveTokenLaunchState,
  type DeploymentEnvironment,
  type TokenLaunchState,
} from "@liend/config"

export type ServerEnv = {
  environment: DeploymentEnvironment
  isProduction: boolean
  /** Explicit CORS allowlist. Never inferred from a hostname suffix. */
  allowedOrigins: string[]
  /** HMAC key for session cookies. Required in production. */
  sessionSecret: string | null
  /** Robinhood Chain JSON-RPC endpoint. Public mainnet is used when unset. */
  rpcUrl: string | null
  token: TokenLaunchState
  /** Postgres DSN (DATABASE_URL). Absent means no durable store is configured. */
  databaseUrl: string | null
  version: string
}

let cached: ServerEnv | null = null

export function readServerEnv(): ServerEnv {
  if (cached) return cached

  const environment = resolveEnvironment(process.env.VERCEL_ENV ?? process.env.LONS_DEPLOY_ENV ?? process.env.LIEND_DEPLOY_ENV)

  cached = {
    environment,
    isProduction: environment === "production",
    allowedOrigins: resolveAllowedOrigins(process.env.LONS_ALLOWED_ORIGINS ?? process.env.LIEND_ALLOWED_ORIGINS),
    sessionSecret: process.env.LONS_SESSION_SECRET?.trim() || process.env.LIEND_SESSION_SECRET?.trim() || null,
    rpcUrl:
      process.env.LONS_ROBINHOOD_RPC_URL?.trim() ||
      "https://rpc.mainnet.chain.robinhood.com",
    token: resolveTokenLaunchState(
      process.env.LONS_TOKEN_CONTRACT ?? process.env.LIEND_TOKEN_MINT,
      process.env.LONS_MIN_HOLDER_BALANCE ?? process.env.LIEND_MIN_HOLDER_BALANCE,
    ),
    databaseUrl:
      process.env.DATABASE_URL?.trim() || process.env.LIEND_DATABASE_URL?.trim() || null,
    version: process.env.LONS_API_VERSION?.trim() || process.env.LIEND_API_VERSION?.trim() || "0.1.0",
  }

  return cached
}

/** Test helper — never called by request handling. */
export function resetServerEnvCache(): void {
  cached = null
}
