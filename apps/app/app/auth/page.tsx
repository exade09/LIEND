"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { sanitizeReturnTo } from "@liend/config"
import { getApiClient } from "@/lib/api"
import { discoverWallets, type DiscoveredWallet } from "@/lib/wallet"
import { useSession } from "@/components/SessionProvider"

/**
 * Wallet authentication.
 *
 * Flow: discover wallet → connect → server issues a challenge → the wallet
 * shows the message and the user signs → server verifies and creates the
 * session. The App never sees a private key and never signs anything itself.
 *
 * `returnTo` is sanitised to a relative path, so an attacker cannot use this
 * screen as an open redirect after a successful login.
 */
function AuthPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { refresh, authenticated, apiConfigured } = useSession()

  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const returnTo = useMemo(
    () => sanitizeReturnTo(params.get("returnTo")) ?? "/",
    [params],
  )

  useEffect(() => {
    // Wallets register in response to the ready event, which they may handle
    // asynchronously, so read the registry on the next tick rather than
    // synchronously inside the effect body.
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) setWallets(discoverWallets())
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (authenticated) router.replace(returnTo)
  }, [authenticated, returnTo, router])

  async function connect(wallet: DiscoveredWallet) {
    const client = getApiClient()
    if (!client) {
      setError("The LONS API is not configured for this deployment")
      return
    }
    setBusy(wallet.name)
    setError(null)
    try {
      const { address } = await wallet.connect()
      const challenge = await client.authChallenge(address, 4663)
      const signature = await wallet.signMessage(challenge.message, address)
      await client.authVerify(address, challenge.nonce, signature)
      await refresh()
      router.replace(returnTo)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Connect wallet</h1>
          <p>Verify your MetaMask account on Robinhood Chain to access LONS</p>
        </div>
      </header>

      {!apiConfigured && (
        <div className="notice">
          <strong>LONS API not configured</strong>
          <p>
            Set <code className="mono">NEXT_PUBLIC_API_URL</code> for this deployment.
          </p>
        </div>
      )}

      <div className="notice">
        <strong>LONS is non-custodial</strong>
        <p>
          You will be asked to sign a plain-text message to prove you control the wallet. This
          creates no transaction and costs no fees. LONS never asks for a seed phrase or private
          key.
        </p>
      </div>

      {error && (
        <div className="notice" data-tone="error">
          <strong>Could not connect</strong>
          <p>{error}</p>
        </div>
      )}

      {wallets.length === 0 ? (
        <div className="empty">
          MetaMask was not detected in this browser. Install MetaMask, then reload this page.
        </div>
      ) : (
        <div className="stack" style={{ maxWidth: 380 }}>
          {wallets.map((wallet) => (
            <button
              className="button button--ghost"
              key={wallet.name}
              type="button"
              disabled={busy !== null || !apiConfigured}
              onClick={() => void connect(wallet)}
            >
              {busy === wallet.name ? "Waiting for wallet…" : `Connect ${wallet.name}`}
            </button>
          ))}
        </div>
      )}
    </>
  )
}


/** useSearchParams requires a Suspense boundary during prerender. */
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <AuthPageInner />
    </Suspense>
  )
}
