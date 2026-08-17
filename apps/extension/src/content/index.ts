/**
 * Content script — the untrusted boundary.
 *
 * Its entire job is: pick an adapter, report which token is on screen, notice
 * navigation, and mount one trigger. The SPA sequencing lives in
 * `./controller`, which is unit-tested.
 *
 * It deliberately holds NO credentials, makes NO network requests, never
 * reads `window.solana` or any injected wallet, never reads host storage or
 * cookies, and never scrapes prices or balances. Everything it can say to the
 * worker is a mint plus a URL, both of which the worker re-validates.
 */

import { selectAdapter } from "@/adapters/registry"
import type { SiteAdapter } from "@/adapters/types"
import { createDetectionController, type DetectionController } from "./controller"
import type { FromContent } from "@/shared/messages"

declare const __LIEND_DEBUG__: boolean

let adapter: SiteAdapter | null = null
let controller: DetectionController | null = null
let disposeNavigation: (() => void) | null = null
let unmountTrigger: (() => void) | null = null

function send(message: FromContent): void {
  // Fire-and-forget. A closed worker port must not throw into the host page.
  try {
    chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError)
  } catch {
    /* extension context invalidated (e.g. reload) — nothing to do */
  }
}

function clearTrigger(): void {
  if (unmountTrigger) {
    unmountTrigger()
    unmountTrigger = null
  }
}

function start(): void {
  const url = new URL(location.href)
  adapter = selectAdapter(url)
  if (!adapter) return

  const active = adapter

  controller = createDetectionController({
    adapter: active,
    getUrl: () => new URL(location.href),
    getDocument: () => document,
    events: {
      onDiagnostic: (info) => {
        // Compiled out of production builds. Carries no secrets or auth data.
        if (__LIEND_DEBUG__) console.debug("[liend] detect", info)
      },
      onNavigating: (pageUrl, identity, generation) => {
        // Drop the trigger immediately so it can never point at the token we
        // just navigated away from. Exactly one trigger exists at any moment
        // because mounting only happens in onToken below.
        clearTrigger()
        send({ type: "NAVIGATION_STARTED", source: active.id, pageUrl, identity, generation })
      },
      onToken: (context, _confidence, identity, generation) => {
        clearTrigger()
        unmountTrigger = active.mountTrigger(() => send({ type: "REQUEST_PANEL_OPEN" }))
        send({ type: "TOKEN_CONTEXT", context, identity, generation })
      },
      onNone: (identity, generation) => {
        clearTrigger()
        send({ type: "CONTEXT_CLEARED", source: active.id, identity, generation })
      },
      onFailed: (_reason, identity, generation) => {
        clearTrigger()
        send({ type: "DETECTION_FAILED", source: active.id, identity, generation })
      },
    },
  })

  disposeNavigation = active.observeNavigation(() => controller?.onNavigation())
  controller.start()
}

function stop(): void {
  disposeNavigation?.()
  disposeNavigation = null
  controller?.dispose()
  controller = null
  clearTrigger()
  adapter = null
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true })
} else {
  start()
}

window.addEventListener("pagehide", stop, { once: true })
