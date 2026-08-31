/**
 * Side panel view model.
 *
 * `deriveView` is a pure function from the worker's snapshot to exactly one of
 * the approved panel states. Keeping it pure and separate from rendering is
 * what makes the whole state matrix unit-testable without a browser.
 *
 * Precedence is deliberate: configuration and connection problems outrank
 * page context, because a disconnected extension cannot say anything truthful
 * about a token.
 */

import type { PanelSnapshot } from "@/shared/messages"

export type PanelView =
  | "first-install"
  | "disconnected"
  | "pairing"
  | "session-expired"
  | "not-configured"
  | "error"
  | "unsupported-page"
  | "supported-no-token"
  | "detecting"
  | "detection-failed"
  | "token-loading"
  | "token-not-launched"
  | "holder-check-pending"
  | "not-eligible"
  | "eligible"

export function deriveView(snapshot: PanelSnapshot): PanelView {
  if (snapshot.error && snapshot.connection !== "connected") {
    return snapshot.error.includes("not configured") ? "not-configured" : "error"
  }

  switch (snapshot.connection) {
    case "first-install":
      return "first-install"
    case "pairing":
      return "pairing"
    case "session-expired":
      return "session-expired"
    case "disconnected":
      return "disconnected"
    case "connected":
      break
  }

  if (snapshot.error) return "error"
  if (snapshot.loading) return "token-loading"

  if (snapshot.page === "unsupported") return "unsupported-page"
  // Navigation in flight. Deliberately ranked above utility state: showing a
  // previous token while the browser is already on another one is the exact
  // failure this state exists to prevent.
  if (snapshot.page === "detecting") return "detecting"
  if (snapshot.page === "detection-failed") return "detection-failed"
  if (snapshot.page === "supported-no-token") return "supported-no-token"

  switch (snapshot.utility.state) {
    case "token-not-launched":
      return "eligible"
    case "holder-check-pending":
      return "holder-check-pending"
    case "not-eligible":
      return "not-eligible"
    case "eligible":
      return "eligible"
    default:
      return "token-loading"
  }
}

export type ViewCopy = {
  title: string
  body: string
  primary: { label: string; action: PanelAction } | null
  secondary: { label: string; action: PanelAction } | null
}

export type PanelAction =
  | "GET_STATE"
  | "START_PAIRING"
  | "CANCEL_PAIRING"
  | "DISCONNECT"
  | "REFRESH"
  | "OPEN_IN_LONS"
  | "OPEN_APP"

/**
 * Copy for every state. No string here implies a value Lons cannot produce,
 * and none of them use "beta", "demo" or "test" — the pre-launch state is a
 * real product state, not a disclaimer.
 */
export function copyFor(view: PanelView, snapshot: PanelSnapshot): ViewCopy {
  switch (view) {
    case "first-install":
      return {
        title: "Welcome to Lons",
        body: "Lons shows liquidity context for supported Robinhood Chain token pages. Connect to get started",
        primary: { label: "Connect Lons", action: "START_PAIRING" },
        secondary: { label: "Open Lons", action: "OPEN_APP" },
      }
    case "disconnected":
      return {
        title: "Connect this browser",
        body: "Approve this browser in the Lons app to see liquidity context here",
        primary: { label: "Connect Lons", action: "START_PAIRING" },
        secondary: { label: "Open Lons", action: "OPEN_APP" },
      }
    case "pairing":
      return {
        title: "Waiting for approval",
        body: `Approve this browser in the Lons app. Check the code matches: ${
          snapshot.pairing?.userCode ?? "…"
        }`,
        primary: null,
        secondary: { label: "Cancel", action: "CANCEL_PAIRING" },
      }
    case "session-expired":
      return {
        title: "Reconnect required",
        body: "Your Lons session expired or this browser was revoked",
        primary: { label: "Reconnect", action: "START_PAIRING" },
        secondary: { label: "Disconnect", action: "DISCONNECT" },
      }
    case "not-configured":
      return {
        title: "Not configured",
        body: "This build has no Lons app or API address. Rebuild with the app and API origins configured",
        primary: null,
        secondary: null,
      }
    case "error":
      return {
        title: "Something went wrong",
        body: snapshot.error ?? "Lons data is unavailable right now",
        primary: { label: "Retry", action: "REFRESH" },
        secondary: null,
      }
    case "unsupported-page":
      return {
        title: "No supported page",
        body: "Open a token page on ponsfamily.com to see Lons context",
        primary: { label: "Open Lons", action: "OPEN_APP" },
        secondary: null,
      }
    case "supported-no-token":
      return {
        title: "No token detected",
        body: "Open a specific token page to see its Lons context",
        primary: { label: "Open Lons", action: "OPEN_APP" },
        secondary: null,
      }
    case "detecting":
      return {
        title: "Detecting token…",
        body: "Reading the token on this page",
        primary: null,
        secondary: null,
      }
    case "detection-failed":
      return {
        title: "Could not read this page",
        body: "Lons could not identify the token on this page",
        primary: { label: "Retry", action: "REFRESH" },
        secondary: { label: "Open Lons", action: "OPEN_APP" },
      }
    case "token-loading":
      return { title: "Loading", body: "Checking Lons context for this token", primary: null, secondary: null }
    case "token-not-launched":
      return {
        title: "Lons utility available",
        body: "Continue in the Lons app to review this position and available liquidity",
        primary: { label: "Open in Lons", action: "OPEN_IN_LONS" },
        secondary: null,
      }
    case "holder-check-pending":
      return {
        title: "Checking your LONS balance",
        body: "Your LONS holdings could not be verified yet. This does not mean you are ineligible",
        primary: { label: "Retry", action: "REFRESH" },
        secondary: { label: "Open in Lons", action: "OPEN_IN_LONS" },
      }
    case "not-eligible":
      return {
        title: "Utility locked",
        body:
          snapshot.utility.state === "not-eligible" && !snapshot.utility.requirementPublished
            ? "The LONS holding requirement has not been published yet"
            : "This wallet does not meet the LONS holding requirement",
        primary: { label: "Open in Lons", action: "OPEN_IN_LONS" },
        secondary: null,
      }
    case "eligible":
      return {
        title: "Lons utility available",
        body: "Continue in the Lons app to review this position and available liquidity",
        primary: { label: "Open in Lons", action: "OPEN_IN_LONS" },
        secondary: null,
      }
  }
}

/**
 * Semantic colour for the state block's left rail.
 *
 * Kept separate from copy so the visual layer cannot drift from the meaning:
 * `eligible` and pre-mint utility read as success, and a pending check never
 * reads as a denial.
 */
export function toneFor(view: PanelView): "brand" | "ok" | "locked" | "error" {
  switch (view) {
    case "eligible":
    case "token-not-launched":
      return "ok"
    case "not-eligible":
    case "session-expired":
      return "locked"
    case "error":
    case "detection-failed":
    case "not-configured":
      return "error"
    default:
      return "brand"
  }
}
