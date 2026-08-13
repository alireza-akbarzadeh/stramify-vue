import { getSessionUser } from '../../utils/session'
import { availableSlugs, isBillingConfigured } from '../../utils/polar'
import { selectBillingState } from '../../utils/subscriptions'
import { STARTER_STATE } from '#shared/types/billing'
import type { BillingState, CheckoutSlug } from '#shared/types/billing'

export interface BillingResponse extends BillingState {
  /**
   * The checkout slugs this deployment has products for. The pricing page uses
   * it to disable a plan whose `POLAR_PRODUCT_*` id is missing, rather than
   * offering a button that fails inside Polar's redirect.
   */
  available: CheckoutSlug[]
}

/**
 * What the viewer is currently entitled to.
 *
 * Starter rather than a 401 when signed out, matching `/api/watch-later` and
 * `/api/history`: "you're on the free tier" is the honest answer for a visitor,
 * and it lets the pricing page render the same component for both cases instead
 * of branching on an error.
 *
 * Never proxies Polar. The answer comes from the local mirror, so a Polar
 * outage degrades to "your plan is whatever the last webhook said" rather than
 * logging everyone out of their paid features.
 */
export default defineEventHandler(async (event): Promise<BillingResponse> => {
  const available = availableSlugs()
  const user = await getSessionUser(event)

  if (!user) {
    return { ...STARTER_STATE, billingEnabled: isBillingConfigured(), available }
  }

  return { ...(await selectBillingState(user.id)), available }
})
