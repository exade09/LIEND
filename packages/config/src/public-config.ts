/**
 * The single public configuration object every LIEND surface reads.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time, so these must be referenced
 * as full literal property accesses (not computed lookups) for the bundler to
 * replace them. That is why this file lists each variable explicitly instead
 * of iterating a map.
 *
 * Migrating from Vercel-generated URLs to a custom domain = change these env
 * vars in the Vercel project and redeploy. No source change.
 */

import { parseOrigin, resolveEnvironment, type DeploymentEnvironment } from "./origins"
import { resolveProjectLinks, type ProjectLinks } from "./links"
import { resolveTokenLaunchState, type TokenLaunchState } from "./token"

export type PublicConfig = {
  environment: DeploymentEnvironment
  /** Null when not configured — surfaces must degrade truthfully, not guess. */
  landingUrl: string | null
  appUrl: string | null
  apiUrl: string | null
  links: ProjectLinks
  token: TokenLaunchState
  solanaCluster: "mainnet-beta" | "devnet" | "testnet"
}

function resolveCluster(raw: string | undefined): PublicConfig["solanaCluster"] {
  if (raw === "devnet") return "devnet"
  if (raw === "testnet") return "testnet"
  return "mainnet-beta"
}

/**
 * Reads public configuration from the environment.
 *
 * Safe to call on the server and in the browser. Never put a secret behind a
 * NEXT_PUBLIC_ variable — everything here ships to the client.
 */
export function readPublicConfig(): PublicConfig {
  return {
    environment: resolveEnvironment(
      process.env.NEXT_PUBLIC_DEPLOY_ENV ?? process.env.VERCEL_ENV,
    ),
    landingUrl: parseOrigin(process.env.NEXT_PUBLIC_LANDING_URL),
    appUrl: parseOrigin(process.env.NEXT_PUBLIC_APP_URL),
    apiUrl: parseOrigin(process.env.NEXT_PUBLIC_API_URL),
    links: resolveProjectLinks({
      pumpFun: process.env.NEXT_PUBLIC_PUMPFUN_URL,
      x: process.env.NEXT_PUBLIC_X_URL,
      docs: process.env.NEXT_PUBLIC_DOCS_URL,
      extension: process.env.NEXT_PUBLIC_EXTENSION_URL,
      extensionMode: process.env.NEXT_PUBLIC_EXTENSION_MODE,
    }),
    token: resolveTokenLaunchState(
      process.env.NEXT_PUBLIC_LIEND_TOKEN_MINT,
      process.env.NEXT_PUBLIC_LIEND_MIN_HOLDER_BALANCE,
    ),
    solanaCluster: resolveCluster(process.env.NEXT_PUBLIC_SOLANA_CLUSTER),
  }
}
