import { isAdminConfigured, isAdminRequest } from "@/lib/admin-session"
import { getPublishedCa, setPublishedCa, storeKind } from "@/lib/published-ca"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return Response.json(
      { error: "sign in required" },
      { status: 401, headers: { "cache-control": "no-store" } },
    )
  }

  const ca = await getPublishedCa()
  return Response.json(
    { ...ca, store: storeKind(), configured: isAdminConfigured() },
    { headers: { "cache-control": "no-store" } },
  )
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return Response.json(
      { error: "sign in required" },
      { status: 401, headers: { "cache-control": "no-store" } },
    )
  }

  let mint = ""
  try {
    const body = (await request.json()) as { mint?: unknown }
    mint = typeof body.mint === "string" ? body.mint.trim() : ""
  } catch {
    mint = ""
  }

  try {
    const ca = await setPublishedCa(mint || null)
    return Response.json(
      { ...ca, store: storeKind() },
      { headers: { "cache-control": "no-store" } },
    )
  } catch {
    return Response.json(
      { error: "the contract address could not be saved" },
      { status: 503, headers: { "cache-control": "no-store" } },
    )
  }
}
