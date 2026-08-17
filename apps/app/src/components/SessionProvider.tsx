"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { UtilityAccess } from "@liend/domain"
import { getApiClient } from "@/lib/api"

/**
 * Session + utility access state.
 *
 * These are deliberately two separate values. A user can be authenticated and
 * still have no utility access — collapsing them into one boolean is exactly
 * the mistake this architecture exists to prevent.
 *
 * The `access` held here is PRESENTATION ONLY. Every privileged operation is
 * re-authorized on the server; nothing in this file grants anything.
 */

type SessionState = {
  loading: boolean
  authenticated: boolean
  wallet: string | null
  access: UtilityAccess
  /** Null when NEXT_PUBLIC_API_URL is unset — surfaces show a config notice. */
  apiConfigured: boolean
  error: string | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [wallet, setWallet] = useState<string | null>(null)
  const [access, setAccess] = useState<UtilityAccess>({ state: "disconnected" })
  const [error, setError] = useState<string | null>(null)

  const client = useMemo(() => getApiClient(), [])
  const apiConfigured = client !== null

  /** Fetches session + access without touching React state. */
  const load = useCallback(async () => {
    if (!client) return null
    const session = await client.session()
    const dto = await client.utilityAccess()
    const access: UtilityAccess =
      dto.state === "eligible" || dto.state === "not-eligible"
        ? {
            state: dto.state,
            wallet: dto.wallet,
            mint: dto.mint,
            // Amounts cross the wire as strings; widen at the boundary.
            balance: BigInt(dto.balance),
            required: dto.required === null ? null : BigInt(dto.required),
          }
        : (dto as UtilityAccess)
    return { session, access }
  }, [client])

  const apply = useCallback((result: Awaited<ReturnType<typeof load>>) => {
    if (!result) return
    setAuthenticated(result.session.authenticated)
    setWallet(result.session.wallet)
    setAccess(result.access)
  }, [])

  const fail = useCallback((caught: unknown) => {
    setError(caught instanceof Error ? caught.message : "Could not reach the LIEND API")
    setAccess({ state: "error", wallet: null, reason: "API unavailable" })
  }, [])

  const refresh = useCallback(async () => {
    if (!client) {
      setLoading(false)
      return
    }
    setError(null)
    try {
      apply(await load())
    } catch (caught) {
      fail(caught)
    } finally {
      setLoading(false)
    }
  }, [client, load, apply, fail])

  const logout = useCallback(async () => {
    if (!client) return
    try {
      await client.logout()
    } finally {
      setAuthenticated(false)
      setWallet(null)
      setAccess({ state: "disconnected" })
    }
  }, [client])

  useEffect(() => {
    if (!client) {
      // No API configured; nothing to load. Settled on the next tick so the
      // effect never sets state synchronously.
      const timer = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(timer)
    }
    let cancelled = false
    load()
      .then((result) => {
        if (!cancelled) apply(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) fail(caught)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, load, apply, fail])

  const value = useMemo<SessionState>(
    () => ({ loading, authenticated, wallet, access, apiConfigured, error, refresh, logout }),
    [loading, authenticated, wallet, access, apiConfigured, error, refresh, logout],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used inside SessionProvider")
  return context
}
