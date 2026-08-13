import type { H3Event } from 'h3'

/**
 * A sliding-window rate limiter, in memory.
 *
 * It exists because the AI routes spend a metered quota on every call — the
 * free Gemini tier is per-minute and per-day, and one impatient viewer holding
 * down Enter would spend it for everyone. Nothing else in the app needs this;
 * a DB write is cheap and already bounded by auth.
 *
 * **Per-instance, deliberately.** Redis is in the stack (ADR-003) but has no
 * client wired up yet, and a limiter that is exactly right across a fleet is
 * not what stands between us and a blown quota — an approximate one that costs
 * nothing already is. When Redis lands in Phase 8 this becomes a `ZADD` +
 * `ZCOUNT` behind the same `check()` signature. Documented in
 * docs/ai-assistant.md so the next session doesn't mistake it for an oversight.
 */
export interface RateLimitRule {
  /** Requests allowed inside one window. */
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Requests left in the current window, after this one. */
  remaining: number
  /** Seconds until the oldest hit falls out of the window. `0` when allowed. */
  retryAfterSeconds: number
}

/**
 * Sweep threshold. Keys are cheap but unbounded — a per-IP limiter on a public
 * route accumulates one entry per visitor forever otherwise. Sweeping on write
 * rather than on a timer keeps this dependency-free and means an idle server
 * does no work at all.
 */
const SWEEP_AT_KEYS = 5_000

export function createRateLimiter(rule: RateLimitRule) {
  /** key → hit timestamps inside the window, oldest first. */
  const hits = new Map<string, number[]>()

  function sweep(now: number) {
    for (const [key, times] of hits) {
      if (!times.length || now - times[times.length - 1]! >= rule.windowMs) hits.delete(key)
    }
  }

  return {
    /**
     * Record an attempt and say whether it may proceed. `now` is injectable so
     * the tests don't have to sleep through a real window.
     */
    check(key: string, now: number = Date.now()): RateLimitResult {
      if (hits.size >= SWEEP_AT_KEYS) sweep(now)

      const cutoff = now - rule.windowMs
      const times = (hits.get(key) ?? []).filter((at) => at > cutoff)

      if (times.length >= rule.limit) {
        hits.set(key, times)
        const oldest = times[0]!
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000))
        }
      }

      times.push(now)
      hits.set(key, times)
      return { allowed: true, remaining: rule.limit - times.length, retryAfterSeconds: 0 }
    },

    /** Test hook. Never called in app code. */
    reset() {
      hits.clear()
    }
  }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>

/**
 * Who to count against. The signed-in user id when there is one, so a shared
 * office NAT doesn't have one budget between them; otherwise the forwarded
 * client IP, which is the only handle we have on an anonymous caller.
 */
export function rateLimitKey(event: H3Event, userId?: string | null): string {
  if (userId) return `user:${userId}`
  const forwarded = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  return `ip:${forwarded || getRequestIP(event) || 'unknown'}`
}

/** `check()` plus the 429 and its `Retry-After`, for handlers that just want the guard. */
export function enforceRateLimit(event: H3Event, limiter: RateLimiter, key: string): void {
  const result = limiter.check(key)
  if (result.allowed) return

  // Number, not a string: h3 types `Retry-After` as numeric seconds and
  // serialises it itself.
  setResponseHeader(event, 'Retry-After', result.retryAfterSeconds)
  throw createError({
    statusCode: 429,
    statusMessage: `Too many AI requests — try again in ${result.retryAfterSeconds}s`
  })
}
