import { Polar } from '@polar-sh/sdk'
import { BILLING_INTERVALS, PAID_TIERS, checkoutSlug } from '#shared/types/billing'
import type { BillingInterval, CheckoutSlug, PaidTier } from '#shared/types/billing'

/**
 * Polar wiring: the SDK client, and the env → product-id catalog the checkout
 * plugin and the webhook handler both read (ADR-026).
 *
 * Nothing here throws at import time. Billing is optional on a deployment the
 * same way each social provider is in `auth.ts` — a dev clone with no Polar
 * credentials boots and runs, it just can't take money, and the UI is told so
 * through `BillingState.billingEnabled` rather than finding out via a 500.
 */

/**
 * Sandbox by default. Production billing has to be opted into explicitly:
 * getting this backwards in the safe direction means test checkouts that don't
 * charge anyone, and in the unsafe direction means real cards charged from a
 * staging box. Polar's environments are fully separate — tokens, products and
 * webhook secrets from one are useless in the other.
 */
const server = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'

const accessToken = process.env.POLAR_ACCESS_TOKEN
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

/** Env var holding the Polar product id for one tier/interval pair. */
function productEnvKey(tier: PaidTier, interval: BillingInterval): string {
  return `POLAR_PRODUCT_${tier.toUpperCase()}_${interval.toUpperCase()}`
}

/**
 * The four paid products, as `{ productId, slug }`, skipping any whose env var
 * is unset. Partial configuration is allowed on purpose: someone testing only
 * the monthly products shouldn't have to invent two yearly ones, and the
 * pricing page marks a plan with no product as unavailable rather than sending
 * a checkout for a slug the plugin never registered.
 */
export function polarProducts(): { productId: string; slug: CheckoutSlug }[] {
  const products: { productId: string; slug: CheckoutSlug }[] = []
  for (const tier of PAID_TIERS) {
    for (const interval of BILLING_INTERVALS) {
      const productId = process.env[productEnvKey(tier, interval)]
      if (productId) products.push({ productId, slug: checkoutSlug(tier, interval) })
    }
  }
  return products
}

/** Which checkout slugs this deployment can actually sell. Surfaced to the UI. */
export function availableSlugs(): CheckoutSlug[] {
  return polarProducts().map((product) => product.slug)
}

/**
 * Product id → what it grants. Built once per process from the same env the
 * checkout plugin reads, so a subscription can only ever resolve to a tier this
 * deployment offered in the first place.
 */
const tierByProductId = new Map<string, { tier: PaidTier; interval: BillingInterval }>()
for (const tier of PAID_TIERS) {
  for (const interval of BILLING_INTERVALS) {
    const productId = process.env[productEnvKey(tier, interval)]
    if (productId) tierByProductId.set(productId, { tier, interval })
  }
}

/**
 * What a Polar product grants, or `null` for one we don't recognise.
 *
 * `null` is a real case, not just a guard: a product created in the Polar
 * dashboard and never added to this app's env will arrive on a webhook. Storing
 * a guessed tier for it would hand out entitlements nobody configured, so the
 * webhook logs and drops it instead.
 */
export function productGrant(productId: string) {
  return tierByProductId.get(productId) ?? null
}

/** Whether Polar is configured enough to run a checkout. */
export function isBillingConfigured(): boolean {
  return Boolean(accessToken) && polarProducts().length > 0
}

/** Whether webhooks can be verified. Without this the plugin must not register the endpoint. */
export function isWebhookConfigured(): boolean {
  return Boolean(webhookSecret)
}

export const polarWebhookSecret = webhookSecret

/**
 * The SDK client, or `null` when unconfigured.
 *
 * Callers must null-check. The alternative — a client built on an empty token —
 * fails at the first API call with an opaque 401 rather than at the boundary
 * where the missing config is obvious.
 */
export const polarClient = accessToken ? new Polar({ accessToken, server }) : null

/** For logs and the billing doc's "which environment am I on" question. */
export const polarServer = server
