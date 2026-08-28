import { describe, expect, it } from "vitest"
import { parseFromContent, parseFromPanel } from "./messages"

const MINT = "0x39dBED3a2bd333467115dE45665cC57F813C4571"

function context(overrides: Record<string, unknown> = {}) {
  return {
    source: "pons",
    chain: "robinhood",
    mint: MINT,
    pageUrl: `https://ponsfamily.com/launchpad/${MINT}`,
    detectedAt: Date.now(),
    ...overrides,
  }
}

describe("content-script message validation", () => {
  it("accepts a well-formed token context", () => {
    const parsed = parseFromContent({ type: "TOKEN_CONTEXT", context: context(), identity: "pons:x", generation: 1 })
    expect(parsed?.type).toBe("TOKEN_CONTEXT")
  })

  it("rejects an unknown message type", () => {
    expect(parseFromContent({ type: "EXECUTE_BORROW" })).toBeNull()
    expect(parseFromContent({ type: "fetchUrl", url: "https://evil.test" })).toBeNull()
  })

  it("rejects a malformed mint", () => {
    expect(parseFromContent({ type: "TOKEN_CONTEXT", context: context({ mint: "not-a-mint" }), identity: "pons:x", generation: 1 })).toBeNull()
    expect(parseFromContent({ type: "TOKEN_CONTEXT", context: context({ mint: "0OIl" }), identity: "pons:x", generation: 1 })).toBeNull()
  })

  it("rejects an unsupported source (Axiom is not enabled)", () => {
    expect(parseFromContent({ type: "TOKEN_CONTEXT", context: context({ source: "axiom" }), identity: "pons:x", generation: 1 })).toBeNull()
  })

  it("rejects a non-robinhood chain", () => {
    expect(parseFromContent({ type: "TOKEN_CONTEXT", context: context({ chain: "ethereum" }), identity: "pons:x", generation: 1 })).toBeNull()
  })

  it("rejects a malformed page URL", () => {
    expect(parseFromContent({ type: "TOKEN_CONTEXT", context: context({ pageUrl: "not a url" }), identity: "pons:x", generation: 1 })).toBeNull()
  })

  it("strips unexpected extra fields rather than trusting them", () => {
    const parsed = parseFromContent({
      type: "TOKEN_CONTEXT",
      context: context({ balance: "999999", eligible: true, priceUsd: "1.23" }),
      identity: "pons:x",
      generation: 1,
    })
    expect(parsed).not.toBeNull()
    const ctx = (parsed as { context: Record<string, unknown> }).context
    // Financial claims from an untrusted page must never survive validation.
    expect(ctx.balance).toBeUndefined()
    expect(ctx.eligible).toBeUndefined()
    expect(ctx.priceUsd).toBeUndefined()
  })

  it("accepts the argument-free panel-open request only", () => {
    expect(parseFromContent({ type: "REQUEST_PANEL_OPEN" })?.type).toBe("REQUEST_PANEL_OPEN")
    // Extra arguments are dropped — the worker decides the target, not the page.
    const parsed = parseFromContent({ type: "REQUEST_PANEL_OPEN", url: "https://evil.test" })
    expect(parsed).not.toBeNull()
    expect((parsed as Record<string, unknown>).url).toBeUndefined()
  })

  it("rejects junk", () => {
    expect(parseFromContent(null)).toBeNull()
    expect(parseFromContent("TOKEN_CONTEXT")).toBeNull()
    expect(parseFromContent({})).toBeNull()
    expect(parseFromContent([])).toBeNull()
  })
})

describe("panel message validation", () => {
  it("accepts known panel actions", () => {
    for (const type of [
      "GET_STATE",
      "START_PAIRING",
      "CANCEL_PAIRING",
      "DISCONNECT",
      "REFRESH",
      "OPEN_IN_LIEND",
      "OPEN_APP",
    ]) {
      expect(parseFromPanel({ type })?.type).toBe(type)
    }
  })

  it("rejects anything else", () => {
    expect(parseFromPanel({ type: "GET_TOKEN" })).toBeNull()
    expect(parseFromPanel({ type: "OPEN_APP", url: "https://evil.test" })).not.toBeNull()
    expect((parseFromPanel({ type: "OPEN_APP", url: "x" }) as Record<string, unknown>).url).toBeUndefined()
  })
})

describe("navigation scope validation", () => {
  it("rejects a token context missing its navigation scope", () => {
    // Without identity+generation the worker cannot judge freshness.
    expect(parseFromContent({ type: "TOKEN_CONTEXT", context: context() })).toBeNull()
  })

  it("rejects a negative or non-integer generation", () => {
    const base = { type: "TOKEN_CONTEXT", context: context(), identity: "pons:x" }
    expect(parseFromContent({ ...base, generation: -1 })).toBeNull()
    expect(parseFromContent({ ...base, generation: 1.5 })).toBeNull()
    expect(parseFromContent({ ...base, generation: "1" })).toBeNull()
  })

  it("rejects an empty identity", () => {
    expect(
      parseFromContent({ type: "CONTEXT_CLEARED", source: "pons", identity: "", generation: 1 }),
    ).toBeNull()
  })

  it("accepts DETECTION_FAILED with a valid scope", () => {
    expect(
      parseFromContent({
        type: "DETECTION_FAILED",
        source: "pons",
        identity: "pons:x",
        generation: 2,
      })?.type,
    ).toBe("DETECTION_FAILED")
  })
})
