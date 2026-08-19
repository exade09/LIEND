import { loadLiveActivity } from "@/lib/liveActivity"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const events = await loadLiveActivity()
    return Response.json(
      { events, asOf: Date.now() },
      {
        headers: {
          "cache-control": "public, s-maxage=12, stale-while-revalidate=30",
        },
      },
    )
  } catch {
    return Response.json(
      { events: [], asOf: Date.now() },
      { status: 200, headers: { "cache-control": "no-store" } },
    )
  }
}
