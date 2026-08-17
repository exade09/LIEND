/**
 * Detection controller.
 *
 * Owns the SPA lifecycle: invalidate on real navigation, retry while evidence
 * settles, and publish exactly one result per navigation — within a deadline
 * that cannot be extended.
 *
 * THE BUG THIS FIXES
 * ------------------
 * Previously every navigation signal called `beginCycle`, which captured a
 * fresh T0. Client-routed apps emit many signals for one logical navigation
 * (pushState + replaceState for query sync + popstate, plus Chrome's own tab
 * events), so the deadline kept restarting and a transition could hang for
 * many seconds even though each individual cycle was bounded.
 *
 * The invariant now is IDENTITY-SCOPED, not call-scoped:
 *
 *   ONE page identity  ==  ONE generation  ==  ONE T0  ==  ONE deadline
 *
 * A repeat signal for the identity already being processed is ignored
 * outright: no generation bump, no T0 reset, no re-announcement. Only a
 * genuinely different identity starts a new cycle.
 *
 * TERMINATION GUARANTEE
 * ---------------------
 * A single deadline timer is armed once at T0 and never rescheduled. Whatever
 * the retry chain does, that timer fires at T0 + HARD_DEADLINE_MS and forces a
 * terminal outcome. Every generation ends in exactly one of `onToken`,
 * `onNone` or `onFailed`; `detecting` is transitional only.
 */

import type { DetectionResult, SiteAdapter } from "@/adapters/types"
import type { TokenContext } from "@/shared/messages"

/** Cumulative offsets (ms) from T0 at which detection is attempted. */
export const DETECTION_SCHEDULE_MS = [0, 250, 600, 1000] as const

/** How long corroboration is insisted upon before the URL alone suffices. */
export const GRACE_MS = 900

/**
 * Absolute ceiling from T0 to a published result. Armed once per generation
 * and never moved — this is what makes the timing bound real rather than
 * nominal.
 */
export const HARD_DEADLINE_MS = 1500

export type DetectionDiagnostic = {
  generation: number
  identity: string
  attempt: number
  elapsedFromT0: number
  urlMint: string | null
  canonicalMint: string | null
  ogMint: string | null
  decision: "accepted" | "pending" | "rejected" | "failed" | "ignored-duplicate"
  confidence?: string
  reason: string
}

export type ControllerEvents = {
  /** Real navigation to a new identity. Panel -> detecting. */
  onNavigating: (pageUrl: string, identity: string, generation: number) => void
  onToken: (context: TokenContext, confidence: string, identity: string, generation: number) => void
  onNone: (identity: string, generation: number) => void
  onFailed: (reason: string, identity: string, generation: number) => void
  /** Development-only diagnostics. Never carries secrets. */
  onDiagnostic?: (info: DetectionDiagnostic) => void
}

export type ControllerDeps = {
  adapter: SiteAdapter
  getUrl: () => URL
  getDocument: () => Document
  events: ControllerEvents
  now?: () => number
  setTimeoutFn?: (fn: () => void, ms: number) => unknown
  clearTimeoutFn?: (handle: unknown) => void
}

export type DetectionController = {
  /** Initial page load. */
  start: () => void
  /** Any navigation signal. Idempotent per page identity. */
  onNavigation: () => void
  dispose: () => void
  currentGeneration: () => number
  currentIdentity: () => string | null
}

export function createDetectionController(deps: ControllerDeps): DetectionController {
  const setTimer = deps.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms))
  const clearTimer = deps.clearTimeoutFn ?? ((handle) => clearTimeout(handle as never))
  const now = deps.now ?? (() => Date.now())

  let generation = 0
  let activeIdentity: string | null = null
  let t0 = 0
  let settled = true
  let attemptTimer: unknown = null
  let deadlineTimer: unknown = null
  let disposed = false

  function clearTimers(): void {
    if (attemptTimer !== null) {
      clearTimer(attemptTimer)
      attemptTimer = null
    }
    if (deadlineTimer !== null) {
      clearTimer(deadlineTimer)
      deadlineTimer = null
    }
  }

  function diagnose(info: Partial<DetectionDiagnostic> & { decision: DetectionDiagnostic["decision"]; reason: string }): void {
    deps.events.onDiagnostic?.({
      generation,
      identity: activeIdentity ?? "",
      attempt: -1,
      elapsedFromT0: now() - t0,
      urlMint: null,
      canonicalMint: null,
      ogMint: null,
      ...info,
    })
  }

  function publishToken(result: Extract<DetectionResult, { status: "token" }>, gen: number, identity: string, reason: string, attempt: number): void {
    settled = true
    clearTimers()
    diagnose({
      attempt,
      urlMint: result.context.mint,
      decision: "accepted",
      confidence: result.confidence,
      reason,
    })
    deps.events.onToken(result.context, result.confidence, identity, gen)
  }

  function publishNone(gen: number, identity: string, reason: string, attempt: number): void {
    settled = true
    clearTimers()
    diagnose({ attempt, decision: "rejected", reason })
    deps.events.onNone(identity, gen)
  }

  function publishFailed(gen: number, identity: string, reason: string): void {
    settled = true
    clearTimers()
    diagnose({ decision: "failed", reason })
    deps.events.onFailed(reason, identity, gen)
  }

  function evaluate(allowUrlOnly: boolean): DetectionResult | null {
    try {
      return deps.adapter.detect(deps.getUrl(), deps.getDocument(), allowUrlOnly)
    } catch {
      return null
    }
  }

  function attempt(gen: number, index: number, identity: string): void {
    if (disposed || settled || gen !== generation) return

    const elapsed = now() - t0
    const allowUrlOnly = elapsed >= GRACE_MS

    // If the page moved on, a newer generation owns the outcome.
    let currentIdentity: string
    try {
      currentIdentity = deps.adapter.identify(deps.getUrl())
    } catch {
      publishFailed(gen, identity, "unreadable-url")
      return
    }
    if (currentIdentity !== identity) return

    const result = evaluate(allowUrlOnly)
    if (result === null) {
      publishFailed(gen, identity, "adapter-threw")
      return
    }

    if (result.status === "token") {
      publishToken(result, gen, identity, allowUrlOnly ? "grace-expired-url-authoritative" : "evidence-consistent", index)
      return
    }

    if (result.status === "none") {
      publishNone(gen, identity, "not-a-token-route", index)
      return
    }

    diagnose({ attempt: index, decision: "pending", reason: "metadata-contradicts-url" })

    // Schedule the next attempt only if it lands before the deadline. The
    // deadline timer itself is already armed and will resolve regardless.
    const next = index + 1
    if (next < DETECTION_SCHEDULE_MS.length && DETECTION_SCHEDULE_MS[next] < HARD_DEADLINE_MS) {
      const delay = DETECTION_SCHEDULE_MS[next] - DETECTION_SCHEDULE_MS[index]
      attemptTimer = setTimer(() => attempt(gen, next, identity), delay)
    }
  }

  /** Fired once per generation at T0 + HARD_DEADLINE_MS. Always terminal. */
  function finalize(gen: number, identity: string): void {
    if (disposed || settled || gen !== generation) return

    const result = evaluate(true)
    if (result === null) {
      publishFailed(gen, identity, "deadline-adapter-threw")
      return
    }
    if (result.status === "token") {
      publishToken(result, gen, identity, "deadline-url-fallback", -1)
      return
    }
    publishNone(gen, identity, "deadline-no-token", -1)
  }

  function beginCycle(identity: string, url: URL, announce: boolean): void {
    generation += 1
    const gen = generation
    activeIdentity = identity
    t0 = now()
    settled = false
    clearTimers()

    // Armed ONCE. Never rescheduled by a retry or a duplicate signal.
    deadlineTimer = setTimer(() => finalize(gen, identity), HARD_DEADLINE_MS)

    if (announce) {
      deps.events.onNavigating(`${url.origin}${url.pathname}`, identity, gen)
    }

    attempt(gen, 0, identity)
  }

  function handleSignal(announce: boolean): void {
    if (disposed) return

    let url: URL
    let identity: string
    try {
      url = deps.getUrl()
      identity = deps.adapter.identify(url)
    } catch {
      publishFailed(generation, activeIdentity ?? "", "unreadable-url")
      return
    }

    // Idempotent: a repeat signal for the identity we are already handling
    // (or have already resolved) must not restart anything. This is the fix
    // for the runaway deadline.
    if (identity === activeIdentity) {
      diagnose({ decision: "ignored-duplicate", reason: settled ? "already-resolved" : "cycle-in-flight" })
      return
    }

    beginCycle(identity, url, announce)
  }

  return {
    start: () => handleSignal(false),
    onNavigation: () => handleSignal(true),
    dispose: () => {
      disposed = true
      settled = true
      clearTimers()
    },
    currentGeneration: () => generation,
    currentIdentity: () => activeIdentity,
  }
}
