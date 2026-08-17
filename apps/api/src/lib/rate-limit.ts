/**
 * Rate limiting boundary.
 *
 * The interface is the deliverable here; the implementation is deliberately
 * honest about its limits.
 *
 * `createInProcessRateLimiter` counts within ONE serverless instance. On
 * Vercel, requests fan out across many instances, so this raises the cost of
 * a naive attack but is NOT a global guarantee. It must not be described as
 * one.
 *
 * A durable distributed limiter needs a shared store (Redis / Upstash), which
 * has not been selected. That is recorded as a remaining deployment
 * dependency rather than papered over with an in-process counter presented as
 * production-grade.
 */

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number }

export interface RateLimiter {
  /** `key` should be a stable, non-PII identifier (e.g. hashed IP + route). */
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>
}

export function createInProcessRateLimiter(): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>()

  return {
    async check(key, limit, windowMs) {
      const now = Date.now()
      const existing = buckets.get(key)

      if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs
        buckets.set(key, { count: 1, resetAt })
        return { allowed: true, remaining: limit - 1, resetAt }
      }

      existing.count += 1
      // Opportunistic cleanup so the map cannot grow without bound.
      if (buckets.size > 5000) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= now) buckets.delete(bucketKey)
        }
      }

      return {
        allowed: existing.count <= limit,
        remaining: Math.max(0, limit - existing.count),
        resetAt: existing.resetAt,
      }
    },
  }
}

/** Suggested budgets for the sensitive endpoints in this phase. */
export const RATE_LIMITS = {
  authChallenge: { limit: 10, windowMs: 60_000 },
  authVerify: { limit: 10, windowMs: 60_000 },
  pairingCreate: { limit: 5, windowMs: 60_000 },
  pairingLookup: { limit: 60, windowMs: 60_000 },
  pairingExchange: { limit: 10, windowMs: 60_000 },
  extensionSession: { limit: 30, windowMs: 60_000 },
} as const

let limiter: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (!limiter) limiter = createInProcessRateLimiter()
  return limiter
}

export function resetRateLimiter(): void {
  limiter = null
}
