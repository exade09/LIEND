import { createLiendApiClient, type LiendApiClient } from "@liend/api-client"
import { readPublicConfig } from "@liend/config"

/**
 * The App's API client.
 *
 * Returns null when NEXT_PUBLIC_API_URL is not configured, so screens render
 * an honest "API not configured" state instead of throwing or silently
 * pointing at a hardcoded origin.
 */
export function getApiClient(): LiendApiClient | null {
  const { apiUrl } = readPublicConfig()
  if (!apiUrl) return null
  return createLiendApiClient({ baseUrl: apiUrl, credentials: "include" })
}
