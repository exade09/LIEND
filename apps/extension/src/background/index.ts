/**
 * Service worker — the only privileged component.
 *
 * MV3 workers terminate when idle, so nothing here relies on module-scope
 * variables surviving. Per-tab state lives in `chrome.storage.session` and is
 * re-read on every request; credentials likewise.
 *
 * It is the sole caller of authenticated LIEND API endpoints. The content
 * script cannot reach the API, and the side panel talks only to this worker,
 * so there is exactly one data path to audit.
 */

import { positionUrl, dashboardUrl } from "@liend/config"
import { APP_URL, isConfigured, VERSION } from "./config"
import { awaitApproval, cancelPairing, readPairing, startPairing } from "./pairing"
import { apiFetch, clearDeviceIdentity, DeviceRevokedError, readDeviceIdentity } from "./session"
import {
  acceptUpdate,
  resolveForDisplay,
  shouldEnterDetecting,
  type TabState,
} from "./tab-state"
import { parseFromContent, parseFromPanel, type PanelSnapshot } from "@/shared/messages"

const STATE_PREFIX = "liend.tab."
const ALLOWED_HOSTS = new Set(["pump.fun", "www.pump.fun"])

/**
 * Mirrors the pump.fun adapter's identity function.
 *
 * The worker needs it to reconcile stored state against the tab's live URL
 * without loading adapter code (which pulls in DOM-only helpers).
 */
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function identifyUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) return null

  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length >= 2 && parts[0] === "coin" && MINT_RE.test(parts[1])) {
    return `pumpfun:${parts[1]}`
  }
  let path = url.pathname
  while (path.length > 0 && path.endsWith("/")) path = path.slice(0, -1)
  return `pumpfun:route:${path || "/"}`
}

// --- per-tab state -----------------------------------------------------------

const stateKey = (tabId: number) => `${STATE_PREFIX}${tabId}`

async function writeTabState(tabId: number, state: TabState | null): Promise<void> {
  if (state) await chrome.storage.session.set({ [stateKey(tabId)]: state })
  else await chrome.storage.session.remove(stateKey(tabId))
}

async function readTabState(tabId: number): Promise<TabState | null> {
  const stored = await chrome.storage.session.get(stateKey(tabId))
  return (stored[stateKey(tabId)] as TabState | undefined) ?? null
}

async function activeTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab ?? null
}

// --- snapshot ----------------------------------------------------------------

type UtilityDto = { state?: unknown; required?: unknown }

async function buildSnapshot(): Promise<PanelSnapshot> {
  const base: PanelSnapshot = {
    connection: "disconnected",
    pairing: null,
    page: "unsupported",
    context: null,
    utility: { state: "unknown" },
    loading: false,
    error: isConfigured() ? null : "LIEND is not configured in this build",
    version: VERSION,
  }

  const pairing = await readPairing()
  if (pairing) return { ...base, connection: "pairing", pairing }

  const identity = await readDeviceIdentity()
  const installed = await chrome.storage.local.get("liend.installed")
  base.connection = identity
    ? "connected"
    : installed["liend.installed"]
      ? "disconnected"
      : "first-install"

  const tab = await activeTab()
  const pageIdentity = identifyUrl(tab?.url)

  if (pageIdentity) {
    // Reconcile stored state against the tab's LIVE identity. Anything
    // describing a different page is stale and must not be shown.
    const resolved = resolveForDisplay(
      tab?.id != null ? await readTabState(tab.id) : null,
      pageIdentity,
    )

    if (!resolved) {
      base.page = "supported-no-token"
    } else if (resolved.phase === "token" && resolved.context) {
      base.page = "token"
      base.context = resolved.context
    } else if (resolved.phase === "detecting") {
      base.page = "detecting"
    } else if (resolved.phase === "failed") {
      base.page = "detection-failed"
    } else {
      base.page = "supported-no-token"
    }
  }

  if (!identity || !isConfigured()) return base

  // Trusted utility state comes from the API only. The extension never
  // decides eligibility from anything it can see locally.
  try {
    const response = await apiFetch("/api/utility-access")
    if (!response) return { ...base, connection: "session-expired" }
    if (response.status === 401) return { ...base, connection: "session-expired" }
    if (!response.ok) return { ...base, error: "LIEND data is unavailable" }

    const dto = (await response.json()) as UtilityDto
    switch (dto.state) {
      case "token-not-launched":
        base.utility = { state: "token-not-launched" }
        break
      case "holder-check-pending":
        base.utility = { state: "holder-check-pending" }
        break
      case "not-eligible":
        base.utility = { state: "not-eligible", requirementPublished: dto.required !== null }
        break
      case "eligible":
        base.utility = { state: "eligible" }
        break
      default:
        base.utility = { state: "unknown" }
    }
  } catch (error) {
    if (error instanceof DeviceRevokedError) {
      return { ...base, connection: "disconnected", error: "This browser connection was revoked" }
    }
    return { ...base, error: "Could not reach the LIEND API" }
  }

  return base
}

async function pushSnapshot(): Promise<void> {
  const snapshot = await buildSnapshot()
  // The panel may be closed; a failed send is expected and ignored.
  chrome.runtime.sendMessage({ type: "SNAPSHOT", snapshot }, () => void chrome.runtime.lastError)
}

// --- deep links --------------------------------------------------------------

async function openInLiend(): Promise<void> {
  const tab = await activeTab()
  const resolved =
    tab?.id != null ? resolveForDisplay(await readTabState(tab.id), identifyUrl(tab.url)) : null
  const context = resolved?.phase === "token" ? resolved.context : null

  // Carries navigation context only — mint and source. No balance, no
  // eligibility, no quote. The App re-fetches all of that itself.
  const url = context ? positionUrl(APP_URL, context.mint, "pumpfun") : dashboardUrl(APP_URL)
  if (url) await chrome.tabs.create({ url })
}

// --- messaging ---------------------------------------------------------------

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  // Messages from a tab are content-script messages: verify the sender's
  // origin is one we actually inject into before trusting the payload.
  if (sender.tab) {
    const fromContent = parseFromContent(raw)
    if (!fromContent) return false

    let host: string
    try {
      host = new URL(sender.url ?? "").hostname
    } catch {
      return false
    }
    if (!ALLOWED_HOSTS.has(host)) return false

    const tabId = sender.tab.id
    if (tabId == null) return false

    void (async () => {
      if (fromContent.type === "REQUEST_PANEL_OPEN") {
        // Runs inside the click's user-gesture window, which Chrome requires.
        try {
          await chrome.sidePanel.open({ tabId })
        } catch {
          /* gesture expired or panel unavailable */
        }
        return
      }

      const scope = { identity: fromContent.identity, generation: fromContent.generation }
      const stored = await readTabState(tabId)

      // Freshness is judged on identity + generation, never on sender.url.
      if (!acceptUpdate(stored, scope)) return

      switch (fromContent.type) {
        case "NAVIGATION_STARTED":
          // A duplicate signal for an already-resolved identity must not push
          // the panel back to detecting.
          if (!shouldEnterDetecting(stored, scope)) return
          await writeTabState(tabId, { ...scope, phase: "detecting", context: null })
          break

        case "TOKEN_CONTEXT":
          await writeTabState(tabId, { ...scope, phase: "token", context: fromContent.context })
          break

        case "CONTEXT_CLEARED":
          await writeTabState(tabId, { ...scope, phase: "none", context: null })
          break

        case "DETECTION_FAILED":
          await writeTabState(tabId, { ...scope, phase: "failed", context: null })
          break
      }

      await pushSnapshot()
    })()
    return false
  }

  // Otherwise it is the side panel (extension origin).
  const fromPanel = parseFromPanel(raw)
  if (!fromPanel) return false

  void (async () => {
    switch (fromPanel.type) {
      case "GET_STATE":
      case "REFRESH":
        sendResponse(await buildSnapshot())
        return
      case "START_PAIRING": {
        try {
          const state = await startPairing()
          sendResponse(await buildSnapshot())
          const result = await awaitApproval(state.requestId, () => void pushSnapshot())
          if (result.outcome === "paired") await chrome.storage.local.set({ "liend.installed": true })
          await pushSnapshot()
        } catch {
          sendResponse({ ...(await buildSnapshot()), error: "Could not start pairing" })
        }
        return
      }
      case "CANCEL_PAIRING":
        await cancelPairing()
        sendResponse(await buildSnapshot())
        return
      case "DISCONNECT":
        await clearDeviceIdentity()
        sendResponse(await buildSnapshot())
        return
      case "OPEN_IN_LIEND":
        await openInLiend()
        sendResponse({ ok: true })
        return
      case "OPEN_APP":
        await chrome.tabs.create({ url: dashboardUrl(APP_URL) })
        sendResponse({ ok: true })
        return
    }
  })()

  // Async response.
  return true
})

// --- lifecycle ---------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  if (details.reason === "install") {
    void chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html?welcome=1") })
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void writeTabState(tabId, null)
})

chrome.tabs.onActivated.addListener(() => void pushSnapshot())

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return

  void (async () => {
    const nextIdentity = identifyUrl(changeInfo.url)
    const stored = await readTabState(tabId)

    // Normalised to identity: query-string churn, hash changes and repeated
    // events for the same page are ignored. Only a genuine identity change
    // clears context. Treating every URL event as navigation was one of the
    // ways the panel kept falling back to "Detecting token…".
    if (!nextIdentity) {
      if (stored) await writeTabState(tabId, null)
      return
    }
    if (stored && stored.identity === nextIdentity) return

    // The content script owns generations; the worker only marks the tab as
    // resolving until the next authoritative message arrives.
    await writeTabState(tabId, {
      identity: nextIdentity,
      generation: stored ? stored.generation : 0,
      phase: "detecting",
      context: null,
    })
    await pushSnapshot()
  })()
})
