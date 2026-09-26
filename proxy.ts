import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_HOSTNAME = "admin.liend.app"

/**
 * Routes that stay reachable while the site is closed.
 *
 * The holding page replaces what a visitor sees, not what the site is: the API
 * keeps answering, the admin console keeps publishing, and assets keep serving
 * so the page it shows is not itself broken. A gate that took those down too
 * would mean dismantling the site to close it and rebuilding it to open.
 */
const ALWAYS_OPEN = [
  "/api",
  "/admin",
  "/soon",
  "/_next",
  "/assets",
  "/favicon.ico",
  "/icon.png",
  "/robots.txt",
  "/sitemap.xml",
]

function getRequestHostname(request: NextRequest) {
  const forwardedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.hostname

  return forwardedHost
    .split(",")[0]
    ?.trim()
    .split(":")[0]
    ?.toLowerCase()
}

/** Closed only when asked for, so a missing variable never hides the site. */
function isClosed(): boolean {
  return process.env.SITE_MODE?.trim().toLowerCase() === "soon"
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isClosed() && !ALWAYS_OPEN.some((open) => pathname === open || pathname.startsWith(`${open}/`))) {
    const soon = request.nextUrl.clone()
    soon.pathname = "/soon"
    soon.search = ""
    // A rewrite rather than a redirect: the address the visitor typed stays in
    // the bar, and nothing caches the site as having moved.
    return NextResponse.rewrite(soon)
  }

  if (getRequestHostname(request) !== ADMIN_HOSTNAME) {
    return NextResponse.next()
  }

  const adminUrl = request.nextUrl.clone()
  adminUrl.pathname = "/admin"

  return NextResponse.rewrite(adminUrl)
}

export const config = {
  // Everything but the paths Next serves for itself. The old matcher was "/"
  // alone, which was enough to rewrite one hostname and would have left every
  // other route open behind the gate.
  matcher: ["/((?!_next/static|_next/image).*)"],
}
