import { handle, json, preflight } from "@/lib/http"
import { requireSession } from "@/lib/session"
import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export function OPTIONS(request: Request) { return preflight(request) }

/** Paired browsers for the authenticated wallet. Empty until real pairings exist. */
export function GET(request: Request) {
  return handle(request, async () => {
    const session = await requireSession(request)
    const devices = await getStore().listDevices(session.address)
    return json(request, {
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label,
        extensionVersion: device.extensionVersion,
        createdAt: device.createdAt,
        lastSeenAt: device.lastSeenAt,
        status: device.revokedAt === null ? "active" : "revoked",
      })),
    })
  })
}
