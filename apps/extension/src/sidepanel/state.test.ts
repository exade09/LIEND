import { describe, expect, it } from "vitest"
import type { PanelSnapshot } from "@/shared/messages"
import { copyFor, deriveView, toneFor } from "./state"

const MINT = "So11111111111111111111111111111111111111112"

function snap(overrides: Partial<PanelSnapshot> = {}): PanelSnapshot {
  return {
    connection: "connected",
    pairing: null,
    page: "token",
    context: {
      source: "pumpfun",
      chain: "solana",
      mint: MINT,
      pageUrl: `https://pump.fun/coin/${MINT}`,
      detectedAt: Date.now(),
    },
    utility: { state: "eligible" },
    loading: false,
    error: null,
    version: "0.1.0",
    ...overrides,
  }
}

describe("deriveView", () => {
  it("maps each connection state", () => {
    expect(deriveView(snap({ connection: "first-install" }))).toBe("first-install")
    expect(deriveView(snap({ connection: "disconnected" }))).toBe("disconnected")
    expect(deriveView(snap({ connection: "session-expired" }))).toBe("session-expired")
    expect(
      deriveView(snap({ connection: "pairing", pairing: { userCode: "ABC-DEF", expiresAt: 1 } })),
    ).toBe("pairing")
  })

  it("surfaces a configuration problem distinctly from a runtime error", () => {
    expect(
      deriveView(snap({ connection: "disconnected", error: "STAYFI is not configured in this build" })),
    ).toBe("not-configured")
    expect(deriveView(snap({ connection: "disconnected", error: "Network down" }))).toBe("error")
  })

  it("prefers connection state over page context", () => {
    // A disconnected extension cannot say anything truthful about a token.
    expect(deriveView(snap({ connection: "disconnected", page: "token" }))).toBe("disconnected")
  })

  it("maps page states when connected", () => {
    expect(deriveView(snap({ page: "unsupported" }))).toBe("unsupported-page")
    expect(deriveView(snap({ page: "supported-no-token" }))).toBe("supported-no-token")
  })

  it("maps every utility state", () => {
    expect(deriveView(snap({ utility: { state: "token-not-launched" } }))).toBe("eligible")
    expect(deriveView(snap({ utility: { state: "holder-check-pending" } }))).toBe("holder-check-pending")
    expect(deriveView(snap({ utility: { state: "not-eligible", requirementPublished: true } }))).toBe("not-eligible")
    expect(deriveView(snap({ utility: { state: "eligible" } }))).toBe("eligible")
  })

  it("treats unknown utility as still loading, never as a denial", () => {
    expect(deriveView(snap({ utility: { state: "unknown" } }))).toBe("token-loading")
  })
})

describe("copyFor", () => {
  it("treats pre-mint utility as available, without beta/demo/test wording", () => {
    const copy = copyFor("token-not-launched", snap({ utility: { state: "token-not-launched" } }))
    expect(copy.title.toLowerCase()).toContain("available")
    const all = `${copy.title} ${copy.body}`.toLowerCase()
    for (const banned of ["beta", "demo", "test", "prototype", "coming soon"]) {
      expect(all).not.toContain(banned)
    }
  })

  it("distinguishes an unpublished requirement from a failed check", () => {
    const unpublished = copyFor(
      "not-eligible",
      snap({ utility: { state: "not-eligible", requirementPublished: false } }),
    )
    expect(unpublished.body).toContain("has not been published")

    const published = copyFor(
      "not-eligible",
      snap({ utility: { state: "not-eligible", requirementPublished: true } }),
    )
    expect(published.body).toContain("does not meet")
  })

  it("never presents a pending holder check as ineligibility", () => {
    const copy = copyFor("holder-check-pending", snap({ utility: { state: "holder-check-pending" } }))
    expect(copy.body).toContain("does not mean you are ineligible")
  })

  it("shows the pairing code so the user can compare it with the app", () => {
    const copy = copyFor(
      "pairing",
      snap({ connection: "pairing", pairing: { userCode: "R8X-D5M", expiresAt: 1 } }),
    )
    expect(copy.body).toContain("R8X-D5M")
    expect(copy.secondary?.action).toBe("CANCEL_PAIRING")
  })

  it("never renders a numeric financial value in any state", () => {
    const views = [
      "first-install", "disconnected", "pairing", "session-expired", "not-configured",
      "error", "unsupported-page", "supported-no-token", "token-loading",
      "token-not-launched", "holder-check-pending", "not-eligible", "eligible",
    ] as const

    for (const view of views) {
      const copy = copyFor(view, snap({ pairing: { userCode: "AAA-BBB", expiresAt: 1 } }))
      const text = `${copy.title} ${copy.body}`
      // No currency figures, percentages or token amounts anywhere.
      expect(text).not.toMatch(/\$\s?\d/)
      expect(text).not.toMatch(/\d+(\.\d+)?\s?(SOL|USD|%)/i)
    }
  })

  it("offers a deep link only where a token context makes it meaningful", () => {
    expect(copyFor("eligible", snap()).primary?.action).toBe("OPEN_IN_LIEND")
    expect(copyFor("unsupported-page", snap()).primary?.action).toBe("OPEN_APP")
  })
})

describe("toneFor — semantic colour cannot drift from meaning", () => {
  it("eligible and pre-mint utility read as success", () => {
    expect(toneFor("eligible")).toBe("ok")
    expect(toneFor("token-not-launched")).toBe("ok")
    const others = [
      "first-install", "disconnected", "pairing", "detecting", "token-loading",
      "unsupported-page", "supported-no-token",
      "holder-check-pending", "not-eligible", "session-expired", "error",
      "detection-failed", "not-configured",
    ] as const
    for (const view of others) expect(toneFor(view)).not.toBe("ok")
  })

  it("a pending holder check never reads as locked or error", () => {
    expect(toneFor("holder-check-pending")).toBe("brand")
  })

  it("detecting reads as neutral brand, not failure", () => {
    expect(toneFor("detecting")).toBe("brand")
  })

  it("real problems read as error", () => {
    expect(toneFor("error")).toBe("error")
    expect(toneFor("detection-failed")).toBe("error")
    expect(toneFor("not-configured")).toBe("error")
  })
})
