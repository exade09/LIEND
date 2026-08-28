import { describe, expect, it } from "vitest"
import { acceptUpdate, resolveForDisplay, shouldEnterDetecting, type TabState } from "./tab-state"

const A = "pons:0x39dBED3a2bd333467115dE45665cC57F813C4571"
const B = "pons:0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB"

function state(identity: string, generation: number, phase: TabState["phase"]): TabState {
  return {
    identity,
    generation,
    phase,
    context:
      phase === "token"
        ? {
            source: "pons",
            chain: "robinhood",
            mint: identity.split(":")[1],
            pageUrl: `https://ponsfamily.com/launchpad/${identity.split(":")[1]}`,
            detectedAt: 1,
          }
        : null,
  }
}

describe("acceptUpdate", () => {
  it("accepts anything when nothing is stored", () => {
    expect(acceptUpdate(null, { identity: A, generation: 0 })).toBe(true)
  })

  it("accepts a different identity — that is a real navigation", () => {
    expect(acceptUpdate(state(A, 5, "token"), { identity: B, generation: 1 })).toBe(true)
  })

  it("accepts the same or newer generation for the same identity", () => {
    expect(acceptUpdate(state(A, 3, "detecting"), { identity: A, generation: 3 })).toBe(true)
    expect(acceptUpdate(state(A, 3, "detecting"), { identity: A, generation: 4 })).toBe(true)
  })

  it("REJECTS a late result from a superseded generation", () => {
    expect(acceptUpdate(state(A, 5, "token"), { identity: A, generation: 4 })).toBe(false)
  })
})

describe("shouldEnterDetecting", () => {
  it("enters detecting for a genuinely new identity", () => {
    expect(shouldEnterDetecting(state(A, 1, "token"), { identity: B, generation: 2 })).toBe(true)
  })

  it("does NOT regress a resolved token on a duplicate same-identity signal", () => {
    // This flicker back to detecting was part of the multi-second hang.
    expect(shouldEnterDetecting(state(A, 2, "token"), { identity: A, generation: 2 })).toBe(false)
  })

  it("does not regress a settled no-token state on a duplicate signal", () => {
    expect(shouldEnterDetecting(state(A, 2, "none"), { identity: A, generation: 2 })).toBe(false)
  })

  it("allows a strictly newer generation to re-open detection", () => {
    expect(shouldEnterDetecting(state(A, 2, "token"), { identity: A, generation: 3 })).toBe(true)
  })

  it("stays in detecting when already detecting", () => {
    expect(shouldEnterDetecting(state(A, 2, "detecting"), { identity: A, generation: 2 })).toBe(true)
  })
})

describe("resolveForDisplay — stale display guard", () => {
  it("returns stored context when the identity matches", () => {
    expect(resolveForDisplay(state(A, 1, "token"), A)?.phase).toBe("token")
  })

  it("REFUSES to show token A when the tab is on token B", () => {
    const resolved = resolveForDisplay(state(A, 1, "token"), B)
    expect(resolved?.phase).toBe("detecting")
    expect(resolved?.context).toBeNull()
  })

  it("treats a stale settled state as detecting", () => {
    expect(resolveForDisplay(state(A, 1, "none"), B)?.phase).toBe("detecting")
  })

  it("returns null with nothing stored or no identity", () => {
    expect(resolveForDisplay(null, A)).toBeNull()
    expect(resolveForDisplay(state(A, 1, "token"), null)).toBeNull()
  })
})
