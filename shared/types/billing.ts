/**
 * The plan catalog — one definition, read by the pricing page, the billing
 * settings page and the server's entitlement checks.
 *
 * This lives in `shared/` rather than in `PricingSection.vue` (where it used to
 * be hardcoded) because the marketing copy and the thing being sold have to
 * agree. A tier the landing page advertises but `requirePlan` doesn't know
 * about is a checkout that takes money for nothing.
 *
 * Prices here are display copy, not the source of truth for what gets charged —
 * Polar holds that, on the products named by `POLAR_PRODUCT_*`. Editing a number
 * here changes the pricing page and nothing else; change the Polar product too.
 */

export const PLAN_TIERS = ['starter', 'creator', 'studio'] as const
export type PlanTier = (typeof PLAN_TIERS)[number]

/** The tiers that have something to check out. `starter` is what you get for free. */
export const PAID_TIERS = ['creator', 'studio'] as const
export type PaidTier = (typeof PAID_TIERS)[number]

export const BILLING_INTERVALS = ['monthly', 'yearly'] as const
export type BillingInterval = (typeof BILLING_INTERVALS)[number]

/**
 * A Polar product slug, e.g. `creator-yearly`. Four of these exist, and each
 * must be registered in the checkout plugin against a real product id — see
 * `server/utils/polar.ts`.
 */
export type CheckoutSlug = `${PaidTier}-${BillingInterval}`

export function checkoutSlug(tier: PaidTier, interval: BillingInterval): CheckoutSlug {
  return `${tier}-${interval}`
}

/**
 * Tier ordering, so `requirePlan(event, 'creator')` also admits Studio.
 * Entitlement is "at least this tier", never an equality check — otherwise
 * every upgrade silently revokes access to the features below it.
 */
export const PLAN_RANK: Record<PlanTier, number> = { starter: 0, creator: 1, studio: 2 }

export function meetsPlan(held: PlanTier, required: PlanTier): boolean {
  return PLAN_RANK[held] >= PLAN_RANK[required]
}

/**
 * Polar's subscription statuses. Only `active` and `trialing` grant access;
 * `past_due` deliberately does not — a failed renewal that keeps the features
 * on until Polar gives up is a month of free Studio.
 */
export const SUBSCRIPTION_STATUSES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid'
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export const ENTITLED_STATUSES: readonly SubscriptionStatus[] = ['active', 'trialing']

export function isEntitled(status: SubscriptionStatus): boolean {
  return ENTITLED_STATUSES.includes(status)
}

/**
 * Monthly display prices in USD. `yearly` is the *per-month* figure when billed
 * annually — that's how the pricing toggle reads it, and the Polar yearly
 * product is priced at twelve times it.
 */
export interface PlanPrice {
  monthly: number
  yearly: number
}

export interface Plan {
  tier: PlanTier
  name: string
  blurb: string
  features: string[]
  /** `null` on the free tier: nothing to buy, so no checkout slug either. */
  price: PlanPrice | null
  featured?: boolean
}

export const PLANS: readonly Plan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    blurb: 'Everything you need to run your first stream.',
    price: null,
    features: [
      '1080p60 ingest',
      'Automatic VOD for 14 days',
      'Live chat + moderation',
      'Basic analytics'
    ]
  },
  {
    tier: 'creator',
    name: 'Creator',
    blurb: 'For creators streaming on a schedule.',
    price: { monthly: 19, yearly: 15 },
    featured: true,
    features: [
      'Everything in Starter',
      '4K60 ingest + WHIP low latency',
      'Unlimited VOD retention',
      'Clips + subscriber-only chat',
      'Full analytics history'
    ]
  },
  {
    tier: 'studio',
    name: 'Studio',
    blurb: 'For teams and multi-channel operations.',
    price: { monthly: 49, yearly: 39 },
    features: [
      'Everything in Creator',
      'Multiple channels',
      'Team roles + audit log',
      'Priority ingest regions',
      'API access'
    ]
  }
]

export function planByTier(tier: PlanTier): Plan {
  // Non-null: `PLANS` covers every member of `PLAN_TIERS`, and the two are
  // edited together. A miss here is a catalog bug, not a runtime condition.
  return PLANS.find((plan) => plan.tier === tier)!
}

/**
 * What `/api/billing/subscription` answers, and what the UI renders from.
 *
 * `tier` is the entitlement the server will actually honour — a canceled or
 * past-due subscription reports `starter` here even though the row still
 * exists, so no caller has to re-derive the status rules.
 */
export interface BillingState {
  tier: PlanTier
  status: SubscriptionStatus | null
  interval: BillingInterval | null
  /** ISO timestamp the paid period runs to, or `null` on Starter. */
  currentPeriodEnd: string | null
  /** Subscription stays active until `currentPeriodEnd`, then stops. */
  cancelAtPeriodEnd: boolean
  /**
   * Whether Polar is configured on this deployment at all. `false` means the
   * pricing page shows its plans but can't take money — the UI says so instead
   * of firing a checkout that 500s.
   */
  billingEnabled: boolean
}

export const STARTER_STATE: BillingState = {
  tier: 'starter',
  status: null,
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  billingEnabled: false
}
