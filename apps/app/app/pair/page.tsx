"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { authUrl, readPublicConfig } from "@liend/config"
import type { PairingRequest } from "@liend/domain"
import { getApiClient } from "@/lib/api"
import { useSession } from "@/components/SessionProvider"

/**
 * Extension pairing approval.
 *
 * Security properties this screen depends on:
 *  - The URL carries only an opaque request id. It is never a bearer token
 *    and grants nothing on its own.
 *  - Authentication is required; a pairing is never approved merely because
 *    this page was opened.
 *  - The user compares the code shown here with the code in the extension
 *    before approving. That comparison is the anti-phishing control.
 *  - Approval is explicit, one-time, and expires.
 */
function PairPageInner() {
  const params = useSearchParams()
  const requestId = params.get("request")
  const { authenticated, apiConfigured, loading } = useSession()

  const [request, setRequest] = useState<PairingRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<"approved" | "rejected" | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const client = getApiClient()
    if (!client || !requestId) return
    let cancelled = false
    client
      .getPairingRequest(requestId)
      .then((result) => {
        if (!cancelled) setRequest(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Pairing request not found")
        }
      })
    return () => {
      cancelled = true
    }
  }, [requestId])

  async function decide(action: "approve" | "reject") {
    const { apiUrl } = readPublicConfig()
    if (!apiUrl || !requestId) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(
        `${apiUrl}/api/pairing/requests/${encodeURIComponent(requestId)}/${action}`,
        { method: "POST", credentials: "include" },
      )
      if (!response.ok) throw new Error("This pairing request has expired or was already used")
      setResult(action === "approve" ? "approved" : "rejected")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete pairing")
    } finally {
      setBusy(false)
    }
  }

  if (!requestId) {
    return (
      <>
        <header className="page-head">
          <div><h1>Connect browser</h1></div>
        </header>
        <div className="empty">This link is missing a pairing request.</div>
      </>
    )
  }

  const { appUrl } = readPublicConfig()

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Connect browser</h1>
          <p>Approve the LONS extension for this browser</p>
        </div>
      </header>

      {!apiConfigured ? (
        <div className="empty">The LONS API is not configured for this deployment.</div>
      ) : loading ? (
        <div className="empty">Loading…</div>
      ) : !authenticated ? (
        <div className="notice">
          <strong>Authentication required</strong>
          <p>Connect and verify your wallet before approving a browser connection.</p>
          <p style={{ marginTop: 12 }}>
            <Link
              className="button button--primary"
              href={
                appUrl
                  ? authUrl(appUrl, `/pair?request=${encodeURIComponent(requestId)}`)
                  : `/auth?returnTo=${encodeURIComponent(`/pair?request=${requestId}`)}`
              }
            >
              Connect wallet
            </Link>
          </p>
        </div>
      ) : result ? (
        <div className="notice">
          <strong>{result === "approved" ? "Browser connected" : "Request rejected"}</strong>
          <p>
            {result === "approved"
              ? "You can return to the LONS extension."
              : "This pairing request was rejected and cannot be reused."}
          </p>
        </div>
      ) : error ? (
        <div className="notice" data-tone="error">
          <strong>Could not complete pairing</strong>
          <p>{error}</p>
        </div>
      ) : request && request.status !== "pending" ? (
        <div className="empty">
          This pairing request is {request.status} and can no longer be approved.
        </div>
      ) : (
        <div className="stack" style={{ maxWidth: 520 }}>
          <div className="notice">
            <strong>Check the code matches</strong>
            <p>
              Approve only if this code is identical to the one shown in your LONS extension. If
              it differs, reject this request.
            </p>
          </div>
          <div className="panel">
            <h2>Pairing code</h2>
            <div className="metric mono" style={{ letterSpacing: "0.12em" }}>
              {request?.userCode ?? "…"}
            </div>
          </div>
          <div className="row">
            <button
              className="button button--primary"
              type="button"
              disabled={busy}
              onClick={() => void decide("approve")}
            >
              Approve this browser
            </button>
            <button
              className="button button--ghost"
              type="button"
              disabled={busy}
              onClick={() => void decide("reject")}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </>
  )
}


/** useSearchParams requires a Suspense boundary during prerender. */
export default function PairPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <PairPageInner />
    </Suspense>
  )
}
