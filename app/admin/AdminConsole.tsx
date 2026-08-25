"use client"

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react"

import { CaPlaque } from "@/components/CaPlaque"
import { PumpFunLink } from "@/components/PumpFunLink"
import { parsePublishedCa, pumpFunCoinUrl, type PublishedCa } from "@/lib/ca"
import { announcePublishedCa } from "@/lib/usePublishedCa"

import styles from "./admin.module.css"

type Gate = {
  configured: boolean
  authenticated: boolean
}

type AdminCaResponse = PublishedCa & {
  store?: "kv" | "postgres" | "local"
  error?: string
}

function ConsoleChrome({ children }: { children: ReactNode }) {
  return (
    <section className={styles.card}>
      <div className={styles.windowBar}>
        <span className={styles.windowBrand}>
          <i aria-hidden="true" />
          LIEND / SITE CONTROL
        </span>
        <span className={styles.secure}>SECURE CHANNEL</span>
        <span className={styles.windowControls} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  )
}

export function AdminConsole() {
  const [gate, setGate] = useState<Gate | null>(null)
  const [password, setPassword] = useState("")
  const [mint, setMint] = useState("")
  const [savedMint, setSavedMint] = useState("")
  const [store, setStore] = useState<AdminCaResponse["store"]>("local")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [bootError, setBootError] = useState(false)

  const applyCa = useCallback((value: AdminCaResponse) => {
    const parsed = parsePublishedCa(value)
    const nextMint = parsed.mint ?? ""
    setMint(nextMint)
    setSavedMint(nextMint)
    setUpdatedAt(parsed.updatedAt)
    if (value.store) setStore(value.store)
    return parsed
  }, [])

  const loadCurrent = useCallback(async () => {
    const response = await fetch("/api/admin/ca", { cache: "no-store" })
    const body = (await response.json().catch(() => null)) as AdminCaResponse | null
    if (!response.ok || !body) {
      throw new Error(body?.error || "could not load the current contract address")
    }
    applyCa(body)
  }, [applyCa])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" })
        const next = (await response.json()) as Gate
        if (!response.ok) throw new Error("session unavailable")
        if (cancelled) return
        setGate(next)
        if (next.authenticated) await loadCurrent()
      } catch {
        if (!cancelled) {
          setBootError(true)
          setGate({ configured: true, authenticated: false })
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [loadCurrent])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setNote("")
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(body?.error || "sign in failed")
        return
      }
      setPassword("")
      setGate({ configured: true, authenticated: true })
      await loadCurrent()
    } catch {
      setError("the secure channel is unavailable")
    } finally {
      setBusy(false)
    }
  }

  const publish = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setNote("")
    try {
      const response = await fetch("/api/admin/ca", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint }),
      })
      const body = (await response.json().catch(() => null)) as AdminCaResponse | null
      if (!response.ok || !body) {
        setError(body?.error || "publish failed")
        return
      }
      const published = applyCa(body)
      announcePublishedCa(published)
      setNote(published.mint ? "published to CA plaques and pump.fun links" : "waiting state published")
    } catch {
      setError("the contract address could not be published")
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" })
      if (!response.ok) throw new Error("sign out failed")
      setGate({ configured: true, authenticated: false })
      setPassword("")
      setNote("")
      setError("")
    } catch {
      setError("the secure channel could not sign out")
    } finally {
      setBusy(false)
    }
  }

  const dirty = mint.trim() !== savedMint

  if (!gate) {
    return (
      <ConsoleChrome>
        <div className={styles.boot}>
          <span className={styles.bootGlyph} aria-hidden="true">L</span>
          <div>
            <p className={styles.eyebrow}>AUTHENTICATING TERMINAL</p>
            <h1 className={styles.title}>SIGN IN</h1>
            <p className={styles.copy}>opening secure channel<span className={styles.caret}>_</span></p>
          </div>
        </div>
      </ConsoleChrome>
    )
  }

  if (!gate.configured) {
    return (
      <ConsoleChrome>
        <p className={styles.eyebrow}>TERMINAL OFFLINE</p>
        <h1 className={styles.title}>ADMIN NOT CONFIGURED</h1>
        <p className={styles.copy}>
          Set <code>LIEND_ADMIN_PASSWORD</code> on this host, then reload the console.
        </p>
      </ConsoleChrome>
    )
  }

  if (!gate.authenticated) {
    return (
      <ConsoleChrome>
        <div className={styles.intro}>
          <span className={styles.introMark} aria-hidden="true">L</span>
          <div>
            <p className={styles.eyebrow}>AUTHORIZED PERSONNEL ONLY</p>
            <h1 className={styles.title}>SIGN IN</h1>
          </div>
        </div>
        <p className={styles.copy}>Enter the site-control password to open the CA broadcast console.</p>
        <form className={styles.field} onSubmit={signIn}>
          <label className={styles.label} htmlFor="admin-password">password</label>
          <input
            id="admin-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {bootError ? <p className={styles.error}>secure channel did not initialize; retry the page</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}>
            <button className={styles.submit} type="submit" disabled={busy || !password}>
              {busy ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </div>
        </form>
      </ConsoleChrome>
    )
  }

  return (
    <ConsoleChrome>
      <div className={styles.intro}>
        <span className={styles.introMark} aria-hidden="true">L</span>
        <div>
          <p className={styles.eyebrow}>CA BROADCAST CONSOLE</p>
          <h1 className={styles.title}>CONTRACT ADDRESS</h1>
        </div>
      </div>

      <p className={styles.copy}>
        Publish any text once. The same value is shown after CA: and appended after https://pump.fun/coin/ on every Pump.fun link on the site.
      </p>

      <dl className={styles.readout}>
        <div>
          <dt>STATE</dt>
          <dd data-live={savedMint ? "true" : "false"}>{savedMint ? "LIVE" : "WAITING"}</dd>
        </div>
        <div>
          <dt>STORAGE</dt>
          <dd>{store?.toUpperCase()}</dd>
        </div>
        <div>
          <dt>SURFACES</dt>
          <dd>CA + PUMP</dd>
        </div>
        <div>
          <dt>UPDATED</dt>
          <dd>{updatedAt ? new Date(updatedAt).toLocaleString() : "NOT YET"}</dd>
        </div>
      </dl>

      <form className={styles.field} onSubmit={publish}>
        <label className={styles.label} htmlFor="admin-mint">CA text</label>
        <input
          id="admin-mint"
          className={styles.input}
          type="text"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="enter any text or symbols"
          value={mint}
          onChange={(event) => {
            setMint(event.target.value)
            setError("")
            setNote("")
          }}
        />
        <p className={styles.inputHint}>SAME VALUE FOR CA: AND PUMP.FUN/COIN/ · LEAVE EMPTY FOR WAITING AND THE PUMP.FUN BOARD</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {note ? <p className={styles.status} role="status">{note}</p> : null}
        <div className={styles.actions}>
          <button className={styles.submit} type="submit" disabled={busy || !dirty}>
            {busy ? "PUBLISHING..." : dirty ? "PUBLISH TO SITE" : "SITE IS UP TO DATE"}
          </button>
          <button className={styles.ghost} type="button" onClick={signOut} disabled={busy}>
            SIGN OUT
          </button>
        </div>
      </form>

      <div className={styles.preview}>
        <div className={styles.previewBar}>
          <span>LIVE PREVIEW</span>
          <span>HEADER / FOOTER / PUMP.FUN</span>
        </div>
        <CaPlaque variant="footer" initialMint={mint.trim() || null} live={false} />
        <div className={styles.pumpPreview}>
          <span className={styles.pumpPreviewLabel}>PUMP.FUN</span>
          <PumpFunLink className={styles.pumpPreviewUrl} mint={mint.trim() || null}>
            {pumpFunCoinUrl(mint.trim() || null)}
          </PumpFunLink>
        </div>
      </div>
    </ConsoleChrome>
  )
}
