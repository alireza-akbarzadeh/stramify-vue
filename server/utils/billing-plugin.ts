import { checkout, polar, portal, webhooks } from '@polar-sh/better-auth'
import { logger } from './logger'
import {
  isBillingConfigured,
  isWebhookConfigured,
  polarClient,
  polarProducts,
  polarServer,
  polarWebhookSecret
} from './polar'
import { syncSubscription } from './subscriptions'
import type { PolarSubscriptionPayload } from './subscriptions'

/**
 * The Polar plugin stack, assembled here rather than inline in `auth.ts` so
 * that file stays a readable list of what auth does (ADR-026).
 *
 * Split out for a second reason too: `auth.ts` is imported by `session.ts`,
 * which is imported by everything. Keeping the subscription-sync import on this
 * side of the boundary keeps `subscriptions.ts` free to depend on the session
 * helpers without an import cycle.
 */

/** Every Polar webhook that changes what a user is entitled to. */
const SUBSCRIPTION_EVENTS = [
  'onSubscriptionCreated',
  'onSubscriptionUpdated',
  'onSubscriptionActive',
  'onSubscriptionCanceled',
  'onSubscriptionUncanceled',
  'onSubscriptionRevoked'
] as const

/**
 * One handler, registered against all six subscription events.
 *
 * They're handled identically on purpose: each payload carries the complete
 * subscription object including its current status, so "canceled" is just
 * another status to mirror, not a separate code path that has to remember to
 * revoke something. Anything that forgets to run leaves a stale entitlement,
 * and six near-identical handlers is exactly how that happens.
 */
function subscriptionHandlers() {
  const handler = (payload: { data: PolarSubscriptionPayload }) => syncSubscription(payload.data)
  return Object.fromEntries(SUBSCRIPTION_EVENTS.map((event) => [event, handler]))
}

export function billingPlugins() {
  if (!polarClient || !isBillingConfigured()) {
    logger.warn('polar: no access token or products configured — billing is disabled')
    return []
  }

  const use = [
    checkout({
      products: polarProducts(),
      // Relative path: the plugin resolves it against better-auth's `baseURL`,
      // so this follows `PUBLIC_APP_URL` between local, staging and production
      // instead of pinning checkout returns to one host.
      successUrl: '/settings/billing?checkout_id={CHECKOUT_ID}',
      // No anonymous checkouts. A subscription is an entitlement on an account,
      // and one bought without a session has no account to attach to — the
      // webhook would land with no `externalId` and be dropped.
      authenticatedUsersOnly: true
    }),
    portal()
  ]

  // Without a verified signature the endpoint would take entitlement changes
  // from anyone who can POST to it, so it isn't registered at all until the
  // secret exists. Billing still works; the mirror just won't update until
  // `POLAR_WEBHOOK_SECRET` is set.
  if (isWebhookConfigured() && polarWebhookSecret) {
    use.push(webhooks({ secret: polarWebhookSecret, ...subscriptionHandlers() }))
  } else {
    logger.warn('polar: POLAR_WEBHOOK_SECRET unset — subscription state will not sync')
  }

  logger.info({ server: polarServer, products: polarProducts().length }, 'polar: billing enabled')

  return [
    polar({
      client: polarClient,
      // Creates the Polar customer with `externalId` set to our user id, which
      // is what lets the webhook attribute a subscription without a mapping
      // table. Users who signed up before billing existed get their customer
      // created on their first checkout, with the same `externalId`.
      createCustomerOnSignUp: true,
      use
    })
  ]
}
