/**
 * LONS product configuration for the landing.
 *
 * Every cross-surface destination resolves from the environment. Nothing here
 * is hardcoded to a domain, so moving from Vercel-generated URLs to a custom
 * domain is an env change plus a redeploy — never a code change.
 *
 * PRODUCT FACTS (approved, and encoded here rather than guessed):
 *  - The LONS token is not launched: there is no ERC-20 contract and no published
 *    holder requirement.
 *  - pons is the launch surface on Robinhood Chain. A published CA remains
 *    visible as the verified contract; the launchpad root is always safe.
 *  - Docs ship on this site at `/docs` until a GitBook origin is configured.
 *  - The published Chrome Web Store listing is the primary extension
 *    distribution channel.
 *
 * Unset destinations resolve to `null`. A null link means the surface must
 * hide or disable that affordance. X stays hidden until NEXT_PUBLIC_X_URL is set.
 */

/** Normalises an absolute URL, returning null when unset or malformed. */
function url(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
  } catch {
    return null
  }
}

/**
 * App origin beside a landing origin: `https://example.test` → `https://app.example.test`.
 * Never invents localhost or a `*.vercel.app` host.
 */
function appUrlBeside(site: string | null): string | null {
  if (!site) return null
  try {
    const parsed = new URL(site)
    const host = parsed.hostname
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".vercel.app")) {
      return null
    }
    if (host.startsWith("app.")) return `${parsed.protocol}//${host}`
    const apex = host.replace(/^www\./, "")
    if (!apex.includes(".")) return null
    return `${parsed.protocol}//app.${apex}`
  } catch {
    return null
  }
}

/** Canonical public origin used by every Launch App / Enter App CTA. */
export const LIEND_APP_URL = "https://app.liend.app"

/** App origin for CTAs. Env wins; otherwise derive from the landing origin. */
export function resolveAppUrl(locationHref?: string): string | null {
  return (
    url(process.env.NEXT_PUBLIC_APP_URL) ??
    appUrlBeside(url(process.env.NEXT_PUBLIC_SITE_URL)) ??
    appUrlBeside(locationHref ? url(locationHref) : null) ??
    LIEND_APP_URL
  )
}

/**
 * How the extension is distributed today.
 *
 * `download` renders "Download Extension" plus manual install steps.
 * `webstore` renders "Add to Chrome". Switching is configuration only — no
 * landing redesign, which is why the CTA reads from here rather than being
 * written into the markup.
 */
export type ExtensionMode = "download" | "webstore"

const extensionMode: ExtensionMode =
  process.env.NEXT_PUBLIC_EXTENSION_MODE === "download" ? "download" : "webstore"

const chromeWebStoreUrl =
  "https://chromewebstore.google.com/detail/liend/gbpmekokakgbojjkmcgcippmlmpjakia?authuser=0&hl=en"

const extensionUrl =
  url(process.env.NEXT_PUBLIC_EXTENSION_URL) ??
  (extensionMode === "webstore" ? chromeWebStoreUrl : null)

export const project = {
  name: "LONS",
  ticker: "LONS",
  network: "Robinhood Chain",
  chainId: 4663,
  nativeCurrency: "ETH",

  /**
   * Own origin, for metadata. Next requires an absolute URL for
   * `metadataBase`, so the fallback is localhost rather than a production
   * domain LIEND does not own yet.
   */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** LIEND App. Production uses the canonical public domain. */
  appUrl:
    url(process.env.NEXT_PUBLIC_APP_URL) ??
    appUrlBeside(url(process.env.NEXT_PUBLIC_SITE_URL)) ??
    LIEND_APP_URL,

  /** LIEND API. Used by the ACCESS GATE to resolve holder eligibility. */
  apiUrl: url(process.env.NEXT_PUBLIC_API_URL),

  /** Extension archive (download mode) or Web Store listing (webstore mode). */
  extensionUrl,
  extensionMode,

  /** Packaged MV3 archive served from this site for developer-mode install. */
  extensionArchive: "/liend-extension.zip",

  /**
   * Static pons destination. Landing chips ignore this once a CA is
   * published and instead open https://www.ponsfamily.com/launchpad/{CA text}.
   */
  ponsUrl: url(process.env.NEXT_PUBLIC_PONS_URL) ?? "https://www.ponsfamily.com",
  xUrl: url(process.env.NEXT_PUBLIC_X_URL),
  /**
   * Docs. Relative `/docs` is the in-product GitBook. Override with an absolute
   * GitBook origin via NEXT_PUBLIC_DOCS_URL when that space is published.
   */
  docsUrl: url(process.env.NEXT_PUBLIC_DOCS_URL) ?? "/docs",

  /** Public block explorer — a real third-party service, not a LIEND claim. */
  explorerUrl: "https://robinhoodchain.blockscout.com",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",

  token: {
    /** No contract exists yet. Set NEXT_PUBLIC_LONS_TOKEN_CONTRACT at launch. */
    mint: process.env.NEXT_PUBLIC_LONS_TOKEN_CONTRACT?.trim() || null,
    get launched(): boolean {
      return Boolean(process.env.NEXT_PUBLIC_LONS_TOKEN_CONTRACT?.trim())
    },
  },

  access: {
    requiresLons: true,
    /** Not published yet. Never defaulted to a number. */
    minimumBalance: null,
  },
} as const

export type ProjectConfig = typeof project

/** Label for the extension CTA, driven by distribution mode. */
export function extensionCtaLabel(): string {
  return project.extensionMode === "webstore" ? "Add to Chrome" : "Download Extension"
}

/** Archive path or Web Store URL the header badge and download CTA should hit. */
export function extensionInstallHref(): string {
  if (project.extensionMode === "webstore" && project.extensionUrl) {
    return project.extensionUrl
  }
  return project.extensionUrl ?? project.extensionArchive
}
