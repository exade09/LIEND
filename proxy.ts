import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_HOSTNAME = "admin.liend.app"

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

export function proxy(request: NextRequest) {
  if (getRequestHostname(request) !== ADMIN_HOSTNAME) {
    return NextResponse.next()
  }

  const adminUrl = request.nextUrl.clone()
  adminUrl.pathname = "/admin"

  return NextResponse.rewrite(adminUrl)
}

export const config = {
  matcher: "/",
}
