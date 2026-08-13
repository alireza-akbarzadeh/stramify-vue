# Billing

Platform subscriptions — what a creator pays **Streamify** for the Creator and
Studio plans. Payments, checkout, invoices, tax and the customer portal are
Polar's; this repo holds the plan catalog, a mirror of subscription state, and
the entitlement checks.

This is **not** channel subscriptions (a viewer paying a creator). That's a
marketplace with payouts to third parties, and Polar's single-organization model
doesn't cover it — see ADR-026's "Rejected" section.

## Why Polar

See [ADR-026](./DECISIONS.md). Short version: it's a merchant of record, so it
owns EU VAT and US sales tax rather than leaving them to us, and it ships a
first-party better-auth plugin — the only auth-integrated option for the stack
we already committed to in ADR-007.

## How it fits together

```
 pricing page / settings ──► authClient.checkout({ slug })
                                     │
                                     ▼
                            Polar hosted checkout
                                     │
                 ┌───────────────────┴──────────────────┐
                 ▼                                      ▼
   redirect → /settings/billing?checkout_id=…   webhook → /api/auth/polar/webhooks
                 │                                      │
                 │                             syncSubscription()
                 │                                      │
                 ▼                                      ▼
        polls /api/billing/subscription  ◄──────  subscriptions table
                                                        │
                                                        ▼
                                       requirePlan(event, 'creator') on gated routes
```

| Piece | File |
| --- | --- |
| Plan catalog (tiers, prices, copy, entitlement rules) | [`shared/types/billing.ts`](../shared/types/billing.ts) |
| Status → user-facing copy | [`shared/utils/billing.ts`](../shared/utils/billing.ts) |
| Polar client + env → product map | [`server/utils/polar.ts`](../server/utils/polar.ts) |
| better-auth plugin stack | [`server/utils/billing-plugin.ts`](../server/utils/billing-plugin.ts) |
| Mirror table | [`server/db/schema/subscriptions.ts`](../server/db/schema/subscriptions.ts) |
| Webhook sync + entitlement resolver | [`server/utils/subscriptions.ts`](../server/utils/subscriptions.ts) |
| `requirePlan` guard | [`server/utils/session.ts`](../server/utils/session.ts) |
| Read endpoint | [`server/api/billing/subscription.get.ts`](../server/api/billing/subscription.get.ts) |
| Client composables | [`app/composables/useBilling.ts`](../app/composables/useBilling.ts) |
| UI | `app/components/billing/`, `app/pages/settings/billing.vue` |

**Polar is the source of truth. The `subscriptions` table is a cache.** It
exists so `requirePlan()` — which runs on every gated request — is one indexed
read instead of a third-party HTTP call. If the two disagree, Polar wins; the
fix is to replay the webhook from Polar's dashboard, not to edit a row.

## Setup

Everything below happens in your Polar dashboard. Nothing in this repo needs
editing to bring billing up — it's all env.

### 1. Create an organization and token

1. Sign up at [polar.sh](https://polar.sh) and create an organization.
2. **Stay in Sandbox** while developing — [sandbox.polar.sh](https://sandbox.polar.sh)
   is a completely separate environment with its own tokens, products and
   webhook secrets. A production token will not work against sandbox or vice
   versa.
3. Settings → *Organization Access Tokens* → create one. Copy it into
   `POLAR_ACCESS_TOKEN`.

### 2. Create four products

The plan catalog in `shared/types/billing.ts` expects a product per tier and
billing interval. Prices there are display copy — **Polar holds what is actually
charged**, so these must match or the pricing page lies:

| Product | Recurring | Price |
| --- | --- | --- |
| Creator Monthly | monthly | $19 |
| Creator Yearly | yearly | $180 ($15/mo) |
| Studio Monthly | monthly | $49 |
| Studio Yearly | yearly | $468 ($39/mo) |

Copy each product's id into the matching env var (below). A tier with no product
id configured renders on the pricing page as "Coming soon" and can't be checked
out — partial configuration is supported on purpose, so you can bring up monthly
first.

The 14-day trial the CTA advertises is configured **on the Polar product**, not
here. Set it there or change the CTA copy in `BillingPlanGrid.vue`.

### 3. Webhook

1. Polar → Settings → Webhooks → add endpoint:
   `https://<your-host>/api/auth/polar/webhooks`
2. Subscribe it to the `subscription.*` events (created, updated, active,
   canceled, uncanceled, revoked). Nothing else is consumed.
3. Copy the signing secret into `POLAR_WEBHOOK_SECRET`.

Locally, Polar can't reach `localhost`. Either use a tunnel
(`cloudflared tunnel --url http://localhost:3000`) and point a sandbox webhook
at it, or accept that local checkouts complete without the mirror updating.

### 4. Environment

```bash
# Sandbox unless this says exactly "production".
POLAR_SERVER=sandbox
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...

POLAR_PRODUCT_CREATOR_MONTHLY=...
POLAR_PRODUCT_CREATOR_YEARLY=...
POLAR_PRODUCT_STUDIO_MONTHLY=...
POLAR_PRODUCT_STUDIO_YEARLY=...
```

Without `POLAR_ACCESS_TOKEN` or with no product ids, the plugin doesn't
register: the app boots, the pricing page renders, and checkout says it isn't
available on this environment. That mirrors how `socialProviders()` treats an
unconfigured OAuth provider — a clone with no billing credentials is a working
clone.

### 5. Migration

```bash
pnpm db:generate && pnpm db:migrate
```

## Gating a feature

```ts
import { requirePlan } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requirePlan(event, 'creator') // Studio passes too — it's "at least"
  // …
})
```

- **401** — not signed in (`requireUser` runs first).
- **402** — signed in, plan too low. Distinct from 403 so the client can offer
  an upgrade instead of an error.

Tier comparison is `>=` via `PLAN_RANK`, never equality: an equality check would
mean upgrading to Studio silently revokes every Creator feature.

Hiding a button in the UI is **not** a gate. Every paid feature needs the
server-side check (CLAUDE.md §5).

## Which statuses grant access

`active` and `trialing` only — `ENTITLED_STATUSES` in
`shared/types/billing.ts`. `past_due` deliberately does **not**: Polar retries a
failed renewal for days, and keeping features on through that is a free month
for anyone who lets their card expire. The billing page still shows the status,
so the user is told to fix their card rather than silently downgraded.

## Common failure modes

**Someone paid and the app still says Starter.** The webhook didn't land. Check
Polar's webhook delivery log first. In dev this is almost always the missing
tunnel. `/settings/billing` polls for ~7s after the redirect to cover normal
webhook lag; past that, the mirror really is empty.

**Webhook returns 404.** The plugin only registers the endpoint when
`POLAR_WEBHOOK_SECRET` is set — an unverifiable webhook endpoint would take
entitlement changes from anyone who can POST to it, so it isn't mounted at all.
Look for `polar: POLAR_WEBHOOK_SECRET unset` at boot.

**Webhook 200s but nothing changes.** `syncSubscription` declines and logs
rather than throwing, because a 500 just makes Polar retry something that will
fail identically. Grep the logs for `polar:`:
- `unmapped product` — the product id isn't in any `POLAR_PRODUCT_*` var. Most
  often a sandbox id left in a production env, or a product recreated in Polar.
- `unknown user` — the customer's `externalId` isn't a user in this database.
  Usually sandbox data pointing at a different deployment's users.
- `no external customer id` — an anonymous checkout. Shouldn't happen;
  `authenticatedUsersOnly: true` is set.

**Checkout 404s on the slug.** The slug isn't registered, i.e. that
`POLAR_PRODUCT_*` var is unset. The UI disables these, so seeing it means env
changed under a running process — Polar product ids are read once at boot.

**Live charges from staging.** `POLAR_SERVER` was set to `production`. It
defaults to sandbox precisely so this needs an explicit act.

## Testing

- `shared/utils/billing.spec.ts` — status → copy, including the `past_due` case
  where a naive card would promise a renewal for a switched-off plan.
- `server/utils/subscriptions.spec.ts` — the entitlement resolver: which
  statuses count, highest-tier-wins during an upgrade overlap, and reporting a
  status behind a revoked entitlement.

Both are pure-function tests with no database and no Polar calls. End-to-end
checkout is exercised manually against sandbox with
[Polar's test cards](https://docs.polar.sh/documentation/integration-guides/testing).
