import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'

/**
 * A local mirror of Polar's subscription state (ADR-026).
 *
 * **Polar is the source of truth; this table is a read cache with a webhook
 * feeding it.** It exists because entitlement is checked on requests, not on
 * page loads: `requirePlan()` runs on every gated endpoint, and an HTTP call to
 * Polar's API on each one would put a third party's latency and uptime in front
 * of our own. A row here is one indexed lookup.
 *
 * The rows are never written by the app's own code paths — only
 * `syncSubscription()`, driven by `subscription.*` webhooks. If this table and
 * Polar disagree, Polar wins and the fix is to replay the webhook, not to patch
 * a row.
 *
 * **Keyed by Polar's subscription id**, not a generated one, so a redelivered
 * webhook upserts the same row instead of creating a second subscription for
 * the same person. Polar redelivers on any non-2xx, so this isn't hypothetical.
 *
 * A user can legitimately have several rows — an expired Creator subscription
 * and a live Studio one — so there's no unique constraint on `user_id`.
 * `selectBillingState` picks the entitled one; see `resolveBillingState`.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    /** Polar's subscription id. */
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /**
     * `creator` | `studio`, resolved from the Polar product id at webhook time
     * rather than stored as the raw product id. The product a subscription
     * points at can be renamed or replaced in Polar; the tier it grants is what
     * the app actually asks about.
     */
    tier: text('tier').notNull(),
    /** `monthly` | `yearly` — display only, entitlement doesn't depend on it. */
    interval: text('interval').notNull(),
    /** Polar's status verbatim; `shared/types/billing.ts` decides which grant access. */
    status: text('status').notNull(),
    /** Kept for support: which Polar product this actually is, whatever the tier mapping says today. */
    productId: text('product_id').notNull(),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => [
    // Every read is "this user's subscriptions" — the entitlement lookup on the
    // hot path. Status isn't in the index: a user has one or two rows, so
    // filtering them in memory beats a wider index.
    index('subscriptions_user_idx').on(table.userId)
  ]
)
