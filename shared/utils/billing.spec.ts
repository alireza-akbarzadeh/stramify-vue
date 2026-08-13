// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { billingSummary } from './billing'
import { STARTER_STATE } from '../types/billing'
import type { BillingState } from '../types/billing'

function state(overrides: Partial<BillingState>): BillingState {
  return { ...STARTER_STATE, billingEnabled: true, ...overrides }
}

describe('billingSummary', () => {
  it('offers no portal to someone who never subscribed', () => {
    const summary = billingSummary(state({}))
    expect(summary.headline).toBe('Starter')
    expect(summary.manageable).toBe(false)
  })

  it('names the renewal date on an active plan', () => {
    const summary = billingSummary(
      state({ tier: 'creator', status: 'active', currentPeriodEnd: '2026-09-01T00:00:00.000Z' })
    )
    expect(summary.detail).toContain('September 1, 2026')
    expect(summary.tone).toBe('success')
  })

  it('warns rather than reassures when an active plan is set to cancel', () => {
    const summary = billingSummary(
      state({
        tier: 'studio',
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: '2026-09-01T00:00:00.000Z'
      })
    )
    expect(summary.detail).toContain('stays active until')
    expect(summary.tone).toBe('warning')
  })

  it('asks for a new card on a failed payment instead of quoting a renewal date', () => {
    // The regression that matters: `past_due` keeps a `currentPeriodEnd`, so a
    // naive card would promise a renewal for a plan that is already switched off.
    const summary = billingSummary(
      state({ status: 'past_due', currentPeriodEnd: '2026-09-01T00:00:00.000Z' })
    )
    expect(summary.detail).toContain('payment failed')
    expect(summary.detail).not.toContain('September')
    expect(summary.tone).toBe('warning')
  })

  it('explains an ended plan rather than showing a bare free tier', () => {
    const summary = billingSummary(state({ status: 'canceled' }))
    expect(summary.detail).toContain('has ended')
    expect(summary.manageable).toBe(true)
  })
})
