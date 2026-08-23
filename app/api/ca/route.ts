import { getPublishedCa } from "@/lib/published-ca"

export const dynamic = "force-dynamic"

export async function GET() {
  const ca = await getPublishedCa()
  return Response.json(ca, {
    headers: { "cache-control": "no-store" },
  })
}
