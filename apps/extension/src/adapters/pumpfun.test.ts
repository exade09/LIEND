import { describe, expect, it } from "vitest"
import { evaluateEvidence, mintFromPath, mintFromUrl } from "./pumpfun"
import { isValidMint } from "./types"
import { selectAdapter } from "./registry"

const MINT = "So11111111111111111111111111111111111111112"
const OTHER = "6F2Z77uzpB7oSx6pG1b8TRTVjQKDbDgPs35qrNr8BZxq"

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

const coinUrl = (mint: string) => new URL(`https://pump.fun/coin/${mint}`)

describe("mint validation", () => {
  it("accepts base58 of the right length", () => {
    expect(isValidMint(MINT)).toBe(true)
  })

  it("rejects non-base58 and wrong lengths", () => {
    expect(isValidMint("0OIl11111111111111111111111111111111111111")).toBe(false)
    expect(isValidMint("short")).toBe(false)
    expect(isValidMint(null)).toBe(false)
    expect(isValidMint("")).toBe(false)
  })
})

describe("mintFromPath", () => {
  it("extracts from the verified /coin/<mint> route", () => {
    expect(mintFromPath(`/coin/${MINT}`)).toBe(MINT)
    expect(mintFromPath(`/coin/${MINT}/`)).toBe(MINT)
  })

  it("ignores non-coin routes", () => {
    expect(mintFromPath("/")).toBeNull()
    expect(mintFromPath("/board")).toBeNull()
    expect(mintFromPath(`/profile/${MINT}`)).toBeNull()
  })

  it("rejects an invalid mint in a coin route", () => {
    expect(mintFromPath("/coin/not-a-mint")).toBeNull()
  })
})

describe("mintFromUrl", () => {
  it("accepts pump.fun hosts only", () => {
    expect(mintFromUrl(`https://pump.fun/coin/${MINT}`)).toBe(MINT)
    expect(mintFromUrl(`https://www.pump.fun/coin/${MINT}`)).toBe(MINT)
  })

  it("rejects look-alike hosts", () => {
    expect(mintFromUrl(`https://pump.fun.evil.com/coin/${MINT}`)).toBeNull()
    expect(mintFromUrl(`https://notpump.fun/coin/${MINT}`)).toBeNull()
    expect(mintFromUrl("garbage")).toBeNull()
    expect(mintFromUrl(null)).toBeNull()
  })
})

describe("evaluateEvidence — three-way outcome", () => {
  it("returns token when canonical and og agree with the path", () => {
    const result = evaluateEvidence(
      coinUrl(MINT),
      fakeDoc(`https://pump.fun/coin/${MINT}`, `https://pump.fun/coin/${MINT}`),
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
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://pump.fun/coin/${OTHER}`))
    expect(result.status).toBe("pending")
  })

  it("returns pending when og:url contradicts the path", () => {
    expect(evaluateEvidence(coinUrl(MINT), fakeDoc(null, `https://pump.fun/coin/${OTHER}`)).status)
      .toBe("pending")
  })

  it("returns pending when the two confirmations disagree with each other", () => {
    const result = evaluateEvidence(
      coinUrl(MINT),
      fakeDoc(`https://pump.fun/coin/${MINT}`, `https://pump.fun/coin/${OTHER}`),
    )
    expect(result.status).toBe("pending")
  })

  it("returns none off a coin route regardless of head tags", () => {
    const result = evaluateEvidence(
      new URL("https://pump.fun/board"),
      fakeDoc(`https://pump.fun/coin/${MINT}`),
    )
    expect(result.status).toBe("none")
  })

  it("carries only identification fields", () => {
    const result = evaluateEvidence(
      new URL(`https://pump.fun/coin/${MINT}?ref=x`),
      fakeDoc(`https://pump.fun/coin/${MINT}`),
    )
    expect(result.status).toBe("token")
    if (result.status !== "token") return
    expect(Object.keys(result.context).sort()).toEqual(
      ["chain", "detectedAt", "mint", "pageUrl", "source"],
    )
    // Query strings are dropped from the recorded page URL.
    expect(result.context.pageUrl).toBe(`https://pump.fun/coin/${MINT}`)
  })
})

describe("adapter registry", () => {
  it("selects pump.fun for supported hosts", () => {
    expect(selectAdapter(new URL("https://pump.fun/"))?.id).toBe("pumpfun")
    expect(selectAdapter(new URL("https://www.pump.fun/board"))?.id).toBe("pumpfun")
  })

  it("selects nothing elsewhere — Axiom stays disabled until verified", () => {
    expect(selectAdapter(new URL("https://axiom.trade/"))).toBeNull()
    expect(selectAdapter(new URL("https://example.com/"))).toBeNull()
  })
})

describe("adapter.detect", () => {
  it("delegates to evaluateEvidence", () => {
    const adapter = selectAdapter(new URL("https://pump.fun/"))!
    const result = adapter.detect(coinUrl(MINT), fakeDoc(`https://pump.fun/coin/${MINT}`))
    expect(result.status).toBe("token")
  })
})

describe("url-only fallback policy", () => {
  it("stays pending while the grace period is open", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://pump.fun/coin/${OTHER}`), false)
    expect(result.status).toBe("pending")
  })

  it("accepts the URL mint once the grace period has expired", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://pump.fun/coin/${OTHER}`), true)
    expect(result.status).toBe("token")
    if (result.status === "token") {
      expect(result.context.mint).toBe(MINT)
      expect(result.confidence).toBe("url-only")
    }
  })

  it("never accepts the stale metadata mint — only the URL mint", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://pump.fun/coin/${OTHER}`), true)
    if (result.status === "token") expect(result.context.mint).not.toBe(OTHER)
  })

  it("does not resurrect an invalid route via the fallback", () => {
    expect(evaluateEvidence(new URL("https://pump.fun/board"), fakeDoc(), true).status).toBe("none")
    expect(
      evaluateEvidence(new URL("https://pump.fun/coin/bad"), fakeDoc(), true).status,
    ).toBe("none")
  })

  it("marks agreeing evidence as corroborated regardless of the flag", () => {
    const result = evaluateEvidence(coinUrl(MINT), fakeDoc(`https://pump.fun/coin/${MINT}`), true)
    if (result.status === "token") expect(result.confidence).toBe("corroborated")
  })
})
