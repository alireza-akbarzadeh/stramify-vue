import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rate-limit'

/**
 * `now` is injected throughout rather than faked with timers — the window is
 * ten minutes wide in production and these tests are about the arithmetic at
 * its edges, not about the clock.
 */
describe('createRateLimiter', () => {
  const rule = { limit: 3, windowMs: 60_000 }

  it('allows exactly `limit` requests and counts down', () => {
    const limiter = createRateLimiter(rule)
    expect(limiter.check('a', 0)).toMatchObject({ allowed: true, remaining: 2 })
    expect(limiter.check('a', 1)).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.check('a', 2)).toMatchObject({ allowed: true, remaining: 0 })
  })

  it('blocks the next one and says how long to wait', () => {
    const limiter = createRateLimiter(rule)
    for (let i = 0; i < 3; i++) limiter.check('a', 0)

    const blocked = limiter.check('a', 10_000)
    expect(blocked.allowed).toBe(false)
    // Oldest hit was at 0, so the window clears at 60s — 50s from now.
    expect(blocked.retryAfterSeconds).toBe(50)
  })

  it('never reports a wait of zero seconds while blocked', () => {
    const limiter = createRateLimiter(rule)
    for (let i = 0; i < 3; i++) limiter.check('a', 0)
    // 1ms before the window clears: still blocked, and "retry in 0s" would be
    // a client-side busy loop.
    expect(limiter.check('a', 59_999).retryAfterSeconds).toBe(1)
  })

  it('lets a request through again once the window slides past the oldest hit', () => {
    const limiter = createRateLimiter(rule)
    for (let i = 0; i < 3; i++) limiter.check('a', 0)
    expect(limiter.check('a', 60_001).allowed).toBe(true)
  })

  it('does not let a blocked caller extend their own lockout', () => {
    const limiter = createRateLimiter(rule)
    for (let i = 0; i < 3; i++) limiter.check('a', 0)
    // Hammering while blocked must not record hits, or the window would keep
    // resetting and the caller would never get back in.
    for (let t = 1000; t < 50_000; t += 1000) limiter.check('a', t)
    expect(limiter.check('a', 60_001).allowed).toBe(true)
  })

  it('budgets each key separately', () => {
    const limiter = createRateLimiter(rule)
    for (let i = 0; i < 3; i++) limiter.check('user:1', 0)
    expect(limiter.check('user:1', 0).allowed).toBe(false)
    expect(limiter.check('user:2', 0).allowed).toBe(true)
  })
})
