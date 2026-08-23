import {
  allowLoginAttempt,
  buildAdminCookie,
  clearAdminCookie,
  isAdminConfigured,
  isAdminRequest,
  passwordMatches,
  requestIp,
  signAdminSession,
} from "@/lib/admin-session"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return Response.json(
    {
      configured: isAdminConfigured(),
      authenticated: isAdminRequest(request),
    },
    { headers: { "cache-control": "no-store" } },
  )
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "admin is not configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    )
  }

  const ip = requestIp(request)
  if (!allowLoginAttempt(ip)) {
    return Response.json(
      { error: "too many attempts" },
      { status: 429, headers: { "cache-control": "no-store" } },
    )
  }

  let password = ""
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === "string" ? body.password : ""
  } catch {
    password = ""
  }

  if (!passwordMatches(password)) {
    return Response.json(
      { error: "wrong password" },
      { status: 401, headers: { "cache-control": "no-store" } },
    )
  }

  return Response.json(
    { authenticated: true },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": buildAdminCookie(signAdminSession()),
      },
    },
  )
}

export async function DELETE() {
  return Response.json(
    { authenticated: false },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": clearAdminCookie(),
      },
    },
  )
}
