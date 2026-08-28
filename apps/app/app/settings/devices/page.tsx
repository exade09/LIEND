"use client"

import { useCallback, useEffect, useState } from "react"
import type { ExtensionDevice } from "@liend/domain"
import { getApiClient } from "@/lib/api"
import { useSession } from "@/components/SessionProvider"

/**
 * Paired browsers.
 *
 * Lists real pairings from durable storage. Revoke is a real API call, not a
 * local UI state change: the server marks the device revoked and invalidates
 * every extension session derived from it.
 */
export default function DevicesPage() {
  const { authenticated, apiConfigured } = useSession()
  const [devices, setDevices] = useState<ExtensionDevice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = getApiClient()
    if (!client || !authenticated) return
    const result = await client.listDevices()
    setDevices(result.devices)
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    const client = getApiClient()
    if (!client) return
    client
      .listDevices()
      .then((result) => {
        if (!cancelled) setDevices(result.devices)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load devices")
        }
      })
    return () => {
      cancelled = true
    }
  }, [authenticated])

  async function revoke(deviceId: string) {
    const client = getApiClient()
    if (!client) return
    setBusy(deviceId)
    setError(null)
    try {
      await client.revokeDevice(deviceId)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not revoke this browser")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Browser connections</h1>
          <p>Browsers paired with the LONS extension</p>
        </div>
      </header>

      {error && (
        <div className="notice" data-tone="error">
          <strong>Something went wrong</strong>
          <p>{error}</p>
        </div>
      )}

      {!apiConfigured ? (
        <div className="empty">The LONS API is not configured for this deployment.</div>
      ) : !authenticated ? (
        <div className="empty">Connect a wallet to see paired browsers.</div>
      ) : devices === null ? (
        <div className="empty">Loading…</div>
      ) : devices.length === 0 ? (
        <div className="empty">
          No browsers are paired with this wallet. Pairing becomes available with the LONS
          extension.
        </div>
      ) : (
        <div className="stack" style={{ maxWidth: 620 }}>
          {devices.map((device) => (
            <div className="panel" key={device.deviceId}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <h2>{device.label}</h2>
                  <p className="muted" style={{ marginTop: 4 }}>
                    Connected {new Date(device.createdAt).toLocaleDateString()}
                    {device.lastSeenAt
                      ? ` · Last used ${new Date(device.lastSeenAt).toLocaleDateString()}`
                      : " · Not used yet"}
                    {device.extensionVersion ? ` · v${device.extensionVersion}` : ""}
                  </p>
                </div>
                <span className="pill" data-tone={device.status === "active" ? "ok" : "idle"}>
                  {device.status}
                </span>
              </div>
              {device.status === "active" && (
                <p style={{ marginTop: 14, marginBottom: 0 }}>
                  <button
                    className="button button--ghost"
                    type="button"
                    disabled={busy === device.deviceId}
                    onClick={() => void revoke(device.deviceId)}
                  >
                    {busy === device.deviceId ? "Revoking…" : "Revoke access"}
                  </button>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
