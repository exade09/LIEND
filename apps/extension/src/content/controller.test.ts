/**
 * SPA navigation sequencing.
 *
 * Regression coverage for all three reported failures:
 *  1. stale token A shown while the browser is on token B
 *  2. detection stuck on "Detecting token…" forever
 *  3. detection deadline restarting, producing 4s / 15-16s hangs
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createDetectionController,
  DETECTION_SCHEDULE_MS,
  GRACE_MS,
  HARD_DEADLINE_MS,
  type ControllerEvents,
} from "./controller"
import type { SiteAdapter } from "@/adapters/types"
import { evaluateEvidence, ponsAdapter } from "@/adapters/pons"

const A = "0x39dBED3a2bd333467115dE45665cC57F813C4571"
const B = "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB"
const C = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"

const coin = (mint: string) => `https://ponsfamily.com/launchpad/${mint}`

function makePage(url: string, canonicalMint: string | null, ogMint = canonicalMint) {
  return {
    url,
    canonicalMint,
    ogMint,
    doc(): Document {
      const canonical = this.canonicalMint
      const og = this.ogMint
      return {
        querySelector(selector: string) {
          if (selector === 'link[rel="canonical"]') {
            return canonical === null ? null : { href: coin(canonical) }
          }
          if (selector === 'meta[property="og:url"]') {
            return og === null ? null : { content: coin(og) }
          }
          return null
        },
      } as unknown as Document
    },
  }
}

function harness(page: ReturnType<typeof makePage>) {
  const events = {
    navigating: [] as { url: string; identity: string; generation: number }[],
    tokens: [] as { mint: string; confidence: string; generation: number }[],
    none: [] as string[],
    failed: [] as string[],
  }

  const adapter: SiteAdapter = {
    id: "pons",
    matches: () => true,
    identify: (u) => ponsAdapter.identify(u),
    detect: (u, d, allow) => evaluateEvidence(u, d, allow),
    observeNavigation: () => () => {},
    mountTrigger: () => () => {},
  }

  const handlers: ControllerEvents = {
    onNavigating: (url, identity, generation) => events.navigating.push({ url, identity, generation }),
    onToken: (c, confidence, _identity, generation) =>
      events.tokens.push({ mint: c.mint, confidence, generation }),
    onNone: (identity) => events.none.push(identity),
    onFailed: (reason) => events.failed.push(reason),
  }

  const controller = createDetectionController({
    adapter,
    getUrl: () => new URL(page.url),
    getDocument: () => page.doc(),
    events: handlers,
  })

  return { controller, events }
}

const mints = (e: { tokens: { mint: string }[] }) => e.tokens.map((t) => t.mint)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
})

describe("initial detection (must not regress)", () => {
  it("emits immediately when evidence agrees", () => {
    const { controller, events } = harness(makePage(coin(A), A))
    controller.start()
    expect(mints(events)).toEqual([A])
    expect(events.tokens[0].confidence).toBe("corroborated")
  })

  it("emits on a page whose head has not rendered", () => {
    const { controller, events } = harness(makePage(coin(A), null))
    controller.start()
    expect(mints(events)).toEqual([A])
  })
})

describe("case 1 — duplicate callbacks must not restart the deadline", () => {
  it("collapses many signals for one navigation into a single generation", () => {
    const page = makePage(coin(A), A, A)
    const { controller, events } = harness(page)
    controller.start()

    page.url = coin(B) // head stays stale so the cycle must run to deadline
    // Simulate pushState + replaceState + popstate + late tab event.
    controller.onNavigation()
    controller.onNavigation()
    controller.onNavigation()
    controller.onNavigation()

    expect(events.navigating).toHaveLength(1)
    const gen = controller.currentGeneration()

    // Keep hammering signals throughout the window.
    for (let t = 0; t < HARD_DEADLINE_MS; t += 100) {
      controller.onNavigation()
      vi.advanceTimersByTime(100)
    }

    expect(controller.currentGeneration()).toBe(gen)
    expect(mints(events)).toEqual([A, B])
    expect(events.navigating).toHaveLength(1)
  })

  it("resolves within the hard deadline despite continuous signals", () => {
    const page = makePage(coin(A), A, A)
    const { controller, events } = harness(page)
    controller.start()

    const startedAt = Date.now()
    page.url = coin(B)
    controller.onNavigation()

    for (let t = 0; t < HARD_DEADLINE_MS + 200; t += 50) {
      controller.onNavigation()
      vi.advanceTimersByTime(50)
      if (mints(events).includes(B)) break
    }

    const elapsed = Date.now() - startedAt
    expect(mints(events)).toContain(B)
    expect(elapsed).toBeLessThanOrEqual(HARD_DEADLINE_MS + 100)
  })
})

describe("case 2 — query churn is not navigation", () => {
  it("keeps one generation across query and hash changes", () => {
    const page = makePage(coin(B), B)
    const { controller, events } = harness(page)
    controller.start()
    const gen = controller.currentGeneration()

    page.url = `${coin(B)}?tab=chart`
    controller.onNavigation()
    page.url = `${coin(B)}?tab=trades&ref=x`
    controller.onNavigation()
    page.url = `${coin(B)}#holders`
    controller.onNavigation()
    page.url = `${coin(B)}/`
    controller.onNavigation()

    expect(controller.currentGeneration()).toBe(gen)
    expect(events.navigating).toHaveLength(0)
    expect(mints(events)).toEqual([B])
  })
})

describe("case 3 — metadata never updates (the Chiikawa bug)", () => {
  it("accepts the URL mint via fallback within the deadline", () => {
    const page = makePage(coin(A), A, A)
    const { controller, events } = harness(page)
    controller.start()

    page.url = coin(B)
    controller.onNavigation()

    vi.advanceTimersByTime(GRACE_MS - 100)
    expect(mints(events)).toEqual([A])

    vi.advanceTimersByTime(HARD_DEADLINE_MS)
    expect(mints(events)).toEqual([A, B])
    expect(events.tokens[1].confidence).toBe("url-only")
    expect(events.none).toHaveLength(0)
  })

  it("leaves no pending timers after resolution", () => {
    const page = makePage(coin(A), A, A)
    const { controller } = harness(page)
    controller.start()
    page.url = coin(B)
    controller.onNavigation()
    vi.advanceTimersByTime(HARD_DEADLINE_MS + 500)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe("case 4 — duplicate signal after resolution", () => {
  it("does not re-announce navigation once B has resolved", () => {
    const page = makePage(coin(A), A)
    const { controller, events } = harness(page)
    controller.start()

    page.url = coin(B)
    page.canonicalMint = B
    page.ogMint = B
    controller.onNavigation()
    vi.advanceTimersByTime(10)
    expect(mints(events)).toEqual([A, B])

    const navCount = events.navigating.length
    controller.onNavigation()
    controller.onNavigation()
    vi.advanceTimersByTime(500)

    expect(events.navigating).toHaveLength(navCount)
    expect(mints(events)).toEqual([A, B])
  })
})

describe("case 5 — rapid A -> B -> C", () => {
  it("only C becomes final", () => {
    const page = makePage(coin(A), A)
    const { controller, events } = harness(page)
    controller.start()

    page.url = coin(B)
    page.canonicalMint = A // stale, so B stays pending
    controller.onNavigation()
    vi.advanceTimersByTime(40)

    page.url = coin(C)
    page.canonicalMint = C
    page.ogMint = C
    controller.onNavigation()
    vi.advanceTimersByTime(HARD_DEADLINE_MS + 200)

    expect(mints(events)[mints(events).length - 1]).toBe(C)
    expect(mints(events)).not.toContain(B)
  })
})

describe("case 6 — unsupported route", () => {
  it("settles to no-token immediately", () => {
    const page = makePage(coin(A), A)
    const { controller, events } = harness(page)
    controller.start()

    page.url = "https://ponsfamily.com/board"
    page.canonicalMint = null
    page.ogMint = null
    controller.onNavigation()

    expect(events.none).toHaveLength(1)
    expect(events.none[0]).toBe("pons:route:/board")
  })

  it("route -> token starts a new generation", () => {
    const page = makePage("https://ponsfamily.com/board", null)
    const { controller, events } = harness(page)
    controller.start()

    page.url = coin(C)
    page.canonicalMint = C
    page.ogMint = C
    controller.onNavigation()
    vi.advanceTimersByTime(10)

    expect(mints(events)).toEqual([C])
  })
})

describe("case 7 — stale generation results", () => {
  it("discards a timer scheduled under a superseded generation", () => {
    const pending: (() => void)[] = []
    const page = makePage(coin(A), B) // contradicting head -> schedules retry

    const events = { tokens: [] as string[], none: 0 }
    const adapter: SiteAdapter = {
      id: "pons",
      matches: () => true,
      identify: (u) => ponsAdapter.identify(u),
      detect: (u, d, allow) => evaluateEvidence(u, d, allow),
      observeNavigation: () => () => {},
      mountTrigger: () => () => {},
    }
    const controller = createDetectionController({
      adapter,
      getUrl: () => new URL(page.url),
      getDocument: () => page.doc(),
      events: {
        onNavigating: () => {},
        onToken: (c) => events.tokens.push(c.mint),
        onNone: () => {
          events.none += 1
        },
        onFailed: () => {},
      },
      setTimeoutFn: (fn) => {
        pending.push(fn)
        return pending.length - 1
      },
      clearTimeoutFn: () => {},
    })

    controller.start()
    expect(events.tokens).toEqual([])
    const staleAttempt = pending[0]

    page.url = coin(B)
    controller.onNavigation()
    const published = events.tokens.length

    // Fire the generation-1 callback while pointing back at A.
    page.url = coin(A)
    page.canonicalMint = A
    page.ogMint = A
    staleAttempt()

    expect(events.tokens).toHaveLength(published)
    expect(events.tokens).not.toContain(A)
  })
})

describe("case 8 — total elapsed time is bounded", () => {
  it("never exceeds the hard deadline for any evidence pattern", () => {
    const patterns: [string | null, string | null][] = [
      [null, null],
      [A, A],
      [A, null],
      [null, A],
      [B, B],
    ]

    for (const [canonical, og] of patterns) {
      const page = makePage(coin(A), A, A)
      const { controller, events } = harness(page)
      controller.start()

      const t0 = Date.now()
      page.url = coin(B)
      page.canonicalMint = canonical
      page.ogMint = og
      controller.onNavigation()

      vi.advanceTimersByTime(HARD_DEADLINE_MS + 50)
      const resolved = events.tokens.length > 1 || events.none.length > 0 || events.failed.length > 0

      expect(resolved).toBe(true)
      expect(Date.now() - t0).toBeLessThanOrEqual(HARD_DEADLINE_MS + 50)
      expect(vi.getTimerCount()).toBe(0)
    }
  })

  it("schedule offsets all sit within the deadline", () => {
    for (const offset of DETECTION_SCHEDULE_MS) {
      expect(offset).toBeLessThan(HARD_DEADLINE_MS)
    }
  })
})

describe("disposal", () => {
  it("cancels pending work so nothing fires after teardown", () => {
    const page = makePage(coin(A), A)
    const { controller, events } = harness(page)
    controller.start()

    page.url = coin(B)
    page.canonicalMint = A
    controller.onNavigation()
    controller.dispose()

    vi.advanceTimersByTime(10_000)
    expect(mints(events)).toEqual([A])
    expect(vi.getTimerCount()).toBe(0)
  })
})
