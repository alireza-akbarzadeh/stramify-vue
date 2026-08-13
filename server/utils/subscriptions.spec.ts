// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveBillingState } from './subscriptions'
import type { SubscriptionRow } from './subscriptions'

function row(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    tier: 'creator',
    interval: 'monthly',
    status: 'active',
    currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides
  }
}

describe('resolveBillingState', () => {
  it('gives Starter to an account with no subscriptions', () => {
    const state = resolveBillingState([], true)
    expect(state.tier).toBe('starter')
    expect(state.status).toBeNull()
  })

  it('grants the tier of an active subscription', () => {
    expect(resolveBillingState([row({ tier: 'studio' })], true).tier).toBe('studio')
  })

  it('counts a trial as entitled', () => {
    expect(resolveBillingState([row({ status: 'trialing' })], true).tier).toBe('creator')
  })

  it.each(['past_due', 'canceled', 'unpaid', 'incomplete'] as const)(
    'grants nothing on a %s subscription',
    (status) => {
      expect(resolveBillingState([row({ status })], true).tier).toBe('starter')
    }
  )

  it('still reports the status behind a revoked entitlement', () => {
    // The billing page needs "your payment failed" — not silence — for someone
    // whose tier has dropped to Starter.
    const state = resolveBillingState([row({ status: 'past_due' })], true)
    expect(state.tier).toBe('starter')
    expect(state.status).toBe('past_due')
  })

  it('takes the highest tier when an upgrade leaves two live subscriptions', () => {
    const state = resolveBillingState(
      [row({ tier: 'creator' }), row({ tier: 'studio', interval: 'yearly' })],
      true
    )
    expect(state.tier).toBe('studio')
    expect(state.interval).toBe('yearly')
  })

  it('ignores a dead higher tier in favour of the live lower one', () => {
    const state = resolveBillingState(
      [row({ tier: 'studio', status: 'canceled' }), row({ tier: 'creator', status: 'active' })],
      true
    )
    expect(state.tier).toBe('creator')
  })

  it('reports the most recent row when nothing is live', () => {
    const state = resolveBillingState(
      [
        row({ tier: 'creator', status: 'canceled', updatedAt: new Date('2026-01-01') }),
        row({ tier: 'studio', status: 'past_due', updatedAt: new Date('2026-08-01') })
      ],
      true
    )
    expect(state.status).toBe('past_due')
  })

  it('passes through whether the deployment can sell anything', () => {
    expect(resolveBillingState([], false).billingEnabled).toBe(false)
    expect(resolveBillingState([row()], true).billingEnabled).toBe(true)
  })
})
