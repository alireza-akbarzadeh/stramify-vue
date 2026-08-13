import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { subscriptions, user } from '../db/schema'
import { logger } from './logger'
import { isBillingConfigured, productGrant } from './polar'
import { PLAN_RANK, STARTER_STATE, isEntitled } from '#shared/types/billing'
import type {
  BillingInterval,
  BillingState,
  PlanTier,
  SubscriptionStatus
} from '#shared/types/billing'

/**
 * Reading and writing the local mirror of Polar's subscription state
 * (`server/db/schema/subscriptions.ts`, ADR-026).
 *
 * Writes come from webhooks only. Reads answer one question — "what is this
 * user entitled to right now" — and every gated endpoint asks it through
 * `requirePlan`, never by looking at the row itself.
 */

/** One mirrored subscription, as the entitlement resolver sees it. */
export interface SubscriptionRow {
  tier: PlanTier
  interval: BillingInterval
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  updatedAt: Date
}

/**
 * The entitlement a set of rows adds up to. Pure, so the precedence rules are
 * testable without a database — they're the part that decides who gets paid
 * features, and they're easy to get subtly wrong.
 *
 * Precedence:
 * 1. Only `active`/`trialing` rows count. A `past_due` Studio grants nothing —
 *    see `ENTITLED_STATUSES` for why that's deliberate.
 * 2. Among those, the highest tier wins. Someone mid-upgrade briefly holds both
 *    a Creator and a Studio subscription; billing them for Studio and serving
 *    them Creator would be the wrong way to resolve that.
 * 3. With nothing entitled, the tier is `starter`, but the most recently
 *    updated row's status still comes back — that's what lets the billing page
 *    say "your payment failed" instead of pretending they were never a
 *    customer.
 */
export function resolveBillingState(
  rows: SubscriptionRow[],
  billingEnabled: boolean
): BillingState {
  const entitled = rows.filter((row) => isEntitled(row.status))

  const best = entitled.length
    ? entitled.reduce((a, b) => (PLAN_RANK[b.tier] > PLAN_RANK[a.tier] ? b : a))
    : // Nothing live: fall back to the latest row purely so its status can be
      // explained to the user. `tier` below stays `starter` regardless.
      rows.reduce<SubscriptionRow | null>(
        (a, b) => (!a || b.updatedAt > a.updatedAt ? b : a),
        null
      )

  if (!best) return { ...STARTER_STATE, billingEnabled }

  return {
    tier: entitled.length ? best.tier : 'starter',
    status: best.status,
    interval: best.interval,
    currentPeriodEnd: best.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: best.cancelAtPeriodEnd,
    billingEnabled
  }
}

/** The signed-in user's entitlement, from the mirror. One indexed read. */
export async function selectBillingState(userId: string): Promise<BillingState> {
  const rows = await db
    .select({
      tier: subscriptions.tier,
      interval: subscriptions.interval,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      updatedAt: subscriptions.updatedAt
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))

  return resolveBillingState(rows as SubscriptionRow[], isBillingConfigured())
}

/**
 * The subscription fields this app consumes from a Polar webhook.
 *
 * Declared structurally rather than imported from the SDK on purpose: it
 * documents exactly which parts of a large third-party payload we depend on, so
 * a Polar release that reshapes the rest doesn't quietly widen our surface. The
 * plugin has already verified the signature by the time this runs.
 */
export interface PolarSubscriptionPayload {
  id: string
  status: string
  productId: string
  currentPeriodEnd?: Date | string | null
  cancelAtPeriodEnd?: boolean | null
  customer?: { externalId?: string | null } | null
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Apply one `subscription.*` webhook to the mirror.
 *
 * Upsert keyed on Polar's subscription id, so redelivery — which Polar does on
 * any non-2xx — converges instead of duplicating. Every subscription event
 * carries the full object, so there's no need to order or diff them; the last
 * write of a given id is simply the current truth.
 *
 * Three ways this legitimately declines to write, all logged rather than
 * thrown, because a 500 back to Polar just schedules a retry of something that
 * will fail identically:
 * - no `externalId` on the customer (an anonymous checkout — nothing to attach
 *   it to),
 * - an `externalId` that isn't one of our users (stale sandbox data, or a
 *   customer created against a different deployment),
 * - a product this deployment doesn't map to a tier (see `productGrant`).
 */
export async function syncSubscription(payload: PolarSubscriptionPayload): Promise<void> {
  const userId = payload.customer?.externalId
  if (!userId) {
    logger.warn({ subscriptionId: payload.id }, 'polar: subscription with no external customer id')
    return
  }

  const grant = productGrant(payload.productId)
  if (!grant) {
    logger.warn(
      { subscriptionId: payload.id, productId: payload.productId },
      'polar: subscription for an unmapped product — no tier granted'
    )
    return
  }

  // The FK would reject this anyway; checking first turns a Postgres constraint
  // error in the webhook path into an explained log line.
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1)
  if (!owner) {
    logger.warn({ subscriptionId: payload.id, userId }, 'polar: subscription for an unknown user')
    return
  }

  const values = {
    id: payload.id,
    userId,
    tier: grant.tier,
    interval: grant.interval,
    status: payload.status,
    productId: payload.productId,
    currentPeriodEnd: toDate(payload.currentPeriodEnd),
    cancelAtPeriodEnd: Boolean(payload.cancelAtPeriodEnd),
    updatedAt: new Date()
  }

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        // `userId` is not updated: a subscription doesn't change hands, and
        // letting a webhook move one between accounts would be a way to
        // transfer entitlements without paying.
        tier: values.tier,
        interval: values.interval,
        status: values.status,
        productId: values.productId,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: values.updatedAt
      }
    })

  logger.info(
    { subscriptionId: payload.id, userId, tier: grant.tier, status: payload.status },
    'polar: subscription synced'
  )
}
