import { describe, expect, it } from "vitest"
import { parseOrigin, resolveAllowedOrigins, resolveEnvironment } from "./origins"
import { parseMinimumBalance, parseMint, resolveTokenLaunchState } from "./token"
import { positionUrl, sanitizeReturnTo, pairUrl, authUrl } from "./deep-links"
import { resolveExtensionMode } from "./links"

const MINT = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
const APP = "https://app.example.test"

describe("parseMint", () => {
  it("accepts a valid Solana mint", () => {
    expect(parseMint(MINT)).toBe(MINT)
  })

  it("rejects malformed input", () => {
    // 0, O, I and l are outside the base58 alphabet on purpose
    expect(parseMint("0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl")).toBeNull()
    expect(parseMint("0x39dBED3a2bd333467115dE45665cC57F813C4571")).toBeNull()
    expect(parseMint("tooshort")).toBeNull()
    expect(parseMint("")).toBeNull()
    expect(parseMint(null)).toBeNull()
    expect(parseMint("../../etc/passwd")).toBeNull()
    expect(parseMint(`${MINT}<script>`)).toBeNull()
  })
})

describe("token launch state", () => {
  it("is not-launched when no mint is configured", () => {
    expect(resolveTokenLaunchState(undefined, undefined).status).toBe("not-launched")
    expect(resolveTokenLaunchState("", "100").status).toBe("not-launched")
  })

  it("never invents a minimum balance", () => {
    const state = resolveTokenLaunchState(MINT, undefined)
    expect(state.status).toBe("launched")
    if (state.status === "launched") expect(state.minimumBalance).toBeNull()
  })

  it("parses large minimums exactly", () => {
    expect(parseMinimumBalance("9007199254740993")).toBe(9_007_199_254_740_993n)
    expect(parseMinimumBalance("12.5")).toBeNull()
    expect(parseMinimumBalance("-1")).toBeNull()
  })
})

describe("origins", () => {
  it("normalises and rejects non-http schemes", () => {
    expect(parseOrigin("https://a.test/")).toBe("https://a.test")
    expect(parseOrigin("javascript:alert(1)")).toBeNull()
    expect(parseOrigin("  ")).toBeNull()
  })

  it("treats unknown VERCEL_ENV as development", () => {
    expect(resolveEnvironment("production")).toBe("production")
    expect(resolveEnvironment("preview")).toBe("preview")
    expect(resolveEnvironment(undefined)).toBe("development")
  })

  it("only trusts explicitly configured origins, never a vercel.app suffix", () => {
    const allowed = resolveAllowedOrigins("https://good.vercel.app,https://app.example.test")
    expect(allowed).toContain("https://good.vercel.app")
    // An arbitrary deployment on the same suffix must NOT be trusted.
    expect(allowed).not.toContain("https://attacker.vercel.app")
  })

  it("returns an empty allowlist when unset — deny by default", () => {
    expect(resolveAllowedOrigins(undefined)).toEqual([])
  })
})

describe("sanitizeReturnTo", () => {
  it("accepts relative paths", () => {
    expect(sanitizeReturnTo("/positions/abc-def")).toBe("/positions/abc-def")
    expect(sanitizeReturnTo("/pair?request=xyz")).toBe("/pair?request=xyz")
  })

  it("rejects open-redirect attempts", () => {
    expect(sanitizeReturnTo("https://evil.test")).toBeNull()
    expect(sanitizeReturnTo("//evil.test")).toBeNull()
    expect(sanitizeReturnTo("/\\evil.test")).toBeNull()
    expect(sanitizeReturnTo("/path\\to")).toBeNull()
    expect(sanitizeReturnTo("/\thttps://evil.test")).toBeNull()
    expect(sanitizeReturnTo("javascript:alert(1)")).toBeNull()
    expect(sanitizeReturnTo("")).toBeNull()
  })
})

describe("deep links", () => {
  it("builds a position link from config, never a literal origin", () => {
    expect(positionUrl(APP, MINT, "pump.fun")).toBe(`${APP}/positions/${MINT}?src=pump.fun`)
  })

  it("refuses to build a link for an invalid mint", () => {
    expect(positionUrl(APP, "not-a-mint")).toBeNull()
  })

  it("carries no financial values", () => {
    const url = new URL(positionUrl(APP, MINT, "pump.fun")!)
    expect([...url.searchParams.keys()]).toEqual(["src"])
  })

  it("puts only an opaque request id in the pairing link", () => {
    const url = new URL(pairUrl(APP, "opaque-id"))
    expect(url.searchParams.get("request")).toBe("opaque-id")
    expect([...url.searchParams.keys()]).toEqual(["request"])
  })

  it("drops an unsafe returnTo instead of forwarding it", () => {
    const url = new URL(authUrl(APP, "https://evil.test"))
    expect(url.searchParams.get("returnTo")).toBeNull()
  })
})

describe("extension distribution", () => {
  it("defaults to download until a Web Store listing exists", () => {
    expect(resolveExtensionMode(undefined)).toBe("download")
    expect(resolveExtensionMode("webstore")).toBe("webstore")
  })
})
