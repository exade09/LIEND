"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { EMPTY_CA, parsePublishedCa, type PublishedCa } from "@/lib/ca"

const PublishedCaContext = createContext<PublishedCa | null>(null)
const CA_EVENT = "liend:ca-published"
const CA_STORAGE_EVENT = "liend:ca-published-at"

function sameCa(left: PublishedCa, right: PublishedCa): boolean {
  return left.mint === right.mint && left.updatedAt === right.updatedAt
}

export function announcePublishedCa(value: PublishedCa) {
  window.dispatchEvent(new CustomEvent(CA_EVENT, { detail: value }))
  try {
    window.localStorage.setItem(
      CA_STORAGE_EVENT,
      JSON.stringify({ ...value, announcedAt: Date.now() }),
    )
  } catch {
    // Same-tab updates still work when storage is unavailable.
  }
}

export function PublishedCaProvider({
  initialValue = EMPTY_CA,
  children,
}: {
  initialValue?: PublishedCa
  children: ReactNode
}) {
  const [ca, setCa] = useState<PublishedCa>(initialValue)

  useEffect(() => {
    let cancelled = false
    let activeController: AbortController | null = null

    const apply = (value: PublishedCa) => {
      if (cancelled) return
      setCa((current) => (sameCa(current, value) ? current : value))
    }

    const refresh = async () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      try {
        const response = await fetch("/api/ca", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) return
        apply(parsePublishedCa(await response.json()))
      } catch {
        // Preserve the last known CA while the public endpoint is unavailable.
      }
    }

    const onPublished = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      apply(parsePublishedCa(detail))
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CA_STORAGE_EVENT || !event.newValue) return
      try {
        apply(parsePublishedCa(JSON.parse(event.newValue)))
      } catch {
        // Ignore malformed cross-tab notifications.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh()
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 12_000)
    window.addEventListener(CA_EVENT, onPublished)
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      activeController?.abort()
      window.clearInterval(timer)
      window.removeEventListener(CA_EVENT, onPublished)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return <PublishedCaContext.Provider value={ca}>{children}</PublishedCaContext.Provider>
}

export function usePublishedCa(initialMint?: string | null): PublishedCa {
  const context = useContext(PublishedCaContext)
  if (context) return context
  return { mint: initialMint ?? null, updatedAt: null }
}
