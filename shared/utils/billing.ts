import { planByTier } from '../types/billing'
import type { BillingState } from '../types/billing'

/**
 * Turning a subscription's status into something a person can act on.
 *
 * Pure and shared rather than a chain of `v-if`s in the settings page, because
 * the awkward cases are the ones that matter: a `past_due` subscription still
 * has a row and a period end, but the features are already off, and a card that
 * says "renews on the 4th" there is a lie the user only discovers by finding
 * their plan gone.
 */

export type BillingTone = 'neutral' | 'success' | 'warning'

export interface BillingSummary {
  headline: string
  detail: string
  tone: BillingTone
  /** Whether to offer the Polar portal — pointless for someone who never paid. */
  manageable: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function billingSummary(state: BillingState): BillingSummary {
  const name = planByTier(state.tier).name
  const ends = formatDate(state.currentPeriodEnd)

  // No subscription has ever existed for this account.
  if (!state.status) {
    return {
      headline: 'Starter',
      detail: "You're on the free plan. Upgrade whenever streaming becomes a habit.",
      tone: 'neutral',
      manageable: false
    }
  }

  if (state.status === 'past_due' || state.status === 'unpaid') {
    return {
      headline: name,
      detail: 'Your last payment failed. Update your payment method to restore your plan.',
      tone: 'warning',
      manageable: true
    }
  }

  if (state.status === 'trialing') {
    return {
      headline: name,
      detail: ends ? `Your trial runs until ${ends}.` : 'Your trial is active.',
      tone: 'success',
      manageable: true
    }
  }

  if (state.status === 'active') {
    return {
      headline: name,
      detail: state.cancelAtPeriodEnd
        ? `Cancelled — your plan stays active until ${ends}.`
        : ends
          ? `Renews on ${ends}.`
          : 'Your plan is active.',
      tone: state.cancelAtPeriodEnd ? 'warning' : 'success',
      manageable: true
    }
  }

  // canceled / incomplete / incomplete_expired — the row is history. `state.tier`
  // has already fallen back to `starter`, so the headline reads "Starter" and
  // the detail explains why rather than leaving it unexplained.
  return {
    headline: name,
    detail: 'Your previous plan has ended. Pick a plan below to start again.',
    tone: 'neutral',
    manageable: true
  }
}
