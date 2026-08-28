import { describe, expect, it } from "vitest"
import { evaluateEvidence, mintFromPath, mintFromUrl } from "./pons"
import { isValidMint } from "./types"
import { selectAdapter } from "./registry"

const MINT = "0x39dBED3a2bd333467115dE45665cC57F813C4571"
const OTHER = "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB"

/** Minimal Document stand-in — only what the adapter actually reads. */
function fakeDoc(canonical?: string | null, ogUrl?: string | null): Document {
  return {
    querySelector(selector: string) {
      if (selector === 'link[rel="canonical"]') {
        return canonical === undefined || canonical === null ? null : { href: canonical }
      }
      if (selector === 'meta[property="og:url"]') {
        return ogUrl === undefined || ogUrl === null ? null : { content: ogUrl }
      }
      return null
    },
  } as unknown as Document
}

const coinUrl = (mint: string) => new URL(`https://ponsfamily.com/launchpad/${mint}`)

describe("mint validation", () => {
  it("accepts a 20-byte EVM contract", () => {
    expect(isValidMint(MINT)).toBe(true)
  })

  it("rejects malformed EVM addresses", () => {
    expect(isValidMint("0OIl11111111111111111111111111111111111111")).toBe(false)
    expect(isValidMint("short")).toBe(false)
    expect(isValidMint(null)).toBe(false)
    expect(isValidMint("")).toBe(false)
  })
})

describe("mintFromPath", () => {
  it("extracts from the verified /launchpad/<mint> route", () => {
    expect(mintFromPath(`/launchpad/${MINT}`)).toBe(MINT)
    expect(mintFromPath(`/launchpad/${MINT}/`)).toBe(MINT)
  })

  it("ignores non-launchpad routes", () => {
    expect(mintFromPath("/")).toBeNull()
    expect(mintFromPath("/board")).toBeNull()
    expect(mintFromPath(`/profile/${MINT}`)).toBeNull()
  })

  it("rejects an invalid mint in a launchpad route", () => {
    expect(mintFromPath("/launchpad/not-a-mint")).toBeNull()
  })
})

describe("mintFromUrl", () => {
  it("accepts ponsfamily.com hosts only", () => {
    expect(mintFromUrl(`https://ponsfamily.com/launchpad/${MINT}`)).toBe(MINT)
    expect(mintFromUrl(`https://www.ponsfamily.com/launchpad/${MINT}`)).toBe(MINT)
  })

  it("rejects look-alike hosts", () => {
    expect(mintFromUrl(`https://ponsfamily.com.evil.com/launchpad/${MINT}`)).toBeNull()
    expect(mintFromUrl(`https://notponsfamily.com/launchpad/${MINT}`)).toBeNull()
    expect(mintFromUrl("garbage")).toBeNull()
    expect(mintFromUrl(null)).toBeNull()
  })
})

describe("evaluateEvidence — three-way outcome", () => {
  it("returns token when canonical and og agree with the path", () => {
    const result = evaluateEvidence(
      coinUrl(MINT),
      fakeDoc(`https://ponsfamily.com/launchpad/${MINT}`, `https://ponsfamily.com/launchpad/${MINT}`),
    )
    expect(result.status).toBe("token")
    if (result.status === "token") expect(result.context.mint).toBe(MINT)
  })

  it("returns token when confirmations are absent — absence is not disagreement", () => {
    expect(evaluateEvidence(coinUrl(MINT), fakeDoc()).status).toBe("token")
  })

  it("returns PENDING (not none) when canonical still names the previous token", () => {
    // This is the regression: mid-SPA-transition the head lags the URL, and
    // reporting "none" here is what emptied the panel.
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://ponsfamily.com/launchpad/${OTHER}`))
    expect(result.status).toBe("pending")
  })

  it("returns pending when og:url contradicts the path", () => {
    expect(evaluateEvidence(coinUrl(MINT), fakeDoc(null, `https://ponsfamily.com/launchpad/${OTHER}`)).status)
      .toBe("pending")
  })

  it("returns pending when the two confirmations disagree with each other", () => {
    const result = evaluateEvidence(
      coinUrl(MINT),
      fakeDoc(`https://ponsfamily.com/launchpad/${MINT}`, `https://ponsfamily.com/launchpad/${OTHER}`),
    )
    expect(result.status).toBe("pending")
  })

  it("returns none off a launchpad route regardless of head tags", () => {
    const result = evaluateEvidence(
      new URL("https://ponsfamily.com/board"),
      fakeDoc(`https://ponsfamily.com/launchpad/${MINT}`),
    )
    expect(result.status).toBe("none")
  })

  it("carries only identification fields", () => {
    const result = evaluateEvidence(
      new URL(`https://ponsfamily.com/launchpad/${MINT}?ref=x`),
      fakeDoc(`https://ponsfamily.com/launchpad/${MINT}`),
    )
    expect(result.status).toBe("token")
    if (result.status !== "token") return
    expect(Object.keys(result.context).sort()).toEqual(
      ["chain", "detectedAt", "mint", "pageUrl", "source"],
    )
    // Query strings are dropped from the recorded page URL.
    expect(result.context.pageUrl).toBe(`https://ponsfamily.com/launchpad/${MINT}`)
  })
})

describe("adapter registry", () => {
  it("selects ponsfamily.com for supported hosts", () => {
    expect(selectAdapter(new URL("https://ponsfamily.com/"))?.id).toBe("pons")
    expect(selectAdapter(new URL("https://www.ponsfamily.com/board"))?.id).toBe("pons")
  })

  it("selects nothing elsewhere — Axiom stays disabled until verified", () => {
    expect(selectAdapter(new URL("https://axiom.trade/"))).toBeNull()
    expect(selectAdapter(new URL("https://example.com/"))).toBeNull()
  })
})

describe("adapter.detect", () => {
  it("delegates to evaluateEvidence", () => {
    const adapter = selectAdapter(new URL("https://ponsfamily.com/"))!
    const result = adapter.detect(coinUrl(MINT), fakeDoc(`https://ponsfamily.com/launchpad/${MINT}`))
    expect(result.status).toBe("token")
  })
})

describe("url-only fallback policy", () => {
  it("stays pending while the grace period is open", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://ponsfamily.com/launchpad/${OTHER}`), false)
    expect(result.status).toBe("pending")
  })

  it("accepts the URL mint once the grace period has expired", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://ponsfamily.com/launchpad/${OTHER}`), true)
    expect(result.status).toBe("token")
    if (result.status === "token") {
      expect(result.context.mint).toBe(MINT)
      expect(result.confidence).toBe("url-only")
    }
  })

  it("never accepts the stale metadata mint — only the URL mint", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://ponsfamily.com/launchpad/${OTHER}`), true)
    if (result.status === "token") expect(result.context.mint).not.toBe(OTHER)
  })

  it("does not resurrect an invalid route via the fallback", () => {
    expect(evaluateEvidence(new URL("https://ponsfamily.com/board"), fakeDoc(), true).status).toBe("none")
    expect(
      evaluateEvidence(new URL("https://ponsfamily.com/launchpad/bad"), fakeDoc(), true).status,
    ).toBe("none")
  })

  it("marks agreeing evidence as corroborated regardless of the flag", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://ponsfamily.com/launchpad/${MINT}`), true)
    if (result.status === "token") expect(result.confidence).toBe("corroborated")
  })
})
