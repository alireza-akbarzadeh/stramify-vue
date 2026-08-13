<script setup lang="ts">
import { useBilling, useCheckout } from '@/composables/useBilling'
import { PLANS, checkoutSlug } from '#shared/types/billing'
import type { BillingInterval, PaidTier } from '#shared/types/billing'

/**
 * The three plans as buyable cards. Shared by the landing page's pricing
 * section and `/settings/billing`, so "which plan am I on" and "can this
 * deployment sell it" are decided once rather than twice (ADR-026).
 */
const props = defineProps<{ interval: BillingInterval }>()

const { data: billing } = useBilling()
const { start, pending } = useCheckout()

/**
 * A paid plan is buyable only if this deployment has a Polar product for that
 * exact tier *and* interval. Without the check, toggling to yearly where only
 * monthly products are configured would offer a checkout that fails inside
 * Polar's redirect, with no UI left to explain it.
 */
function isAvailable(tier: PaidTier) {
  return billing.value?.available.includes(checkoutSlug(tier, props.interval)) ?? false
}

function ctaFor(tier: PaidTier) {
  if (billing.value?.tier === tier) return 'Current plan'
  if (!isAvailable(tier)) return 'Coming soon'
  return 'Start 14-day trial'
}
</script>

<template>
  <div>
    <div class="grid gap-5 lg:grid-cols-3">
      <Reveal v-for="(plan, i) in PLANS" :key="plan.tier" class="h-full" :delay="i * 0.08">
        <PricingCard
          :plan="plan"
          :interval="interval"
          :cta="plan.price ? ctaFor(plan.tier as PaidTier) : 'Start free'"
          :current="billing?.tier === plan.tier"
          :disabled="Boolean(plan.price) && !isAvailable(plan.tier as PaidTier)"
          :loading="pending === checkoutSlug(plan.tier as PaidTier, interval)"
          @select="start(plan.tier as PaidTier, interval)"
        />
      </Reveal>
    </div>

    <p v-if="billing && !billing.billingEnabled" class="mt-8 text-center text-sm text-muted-foreground">
      Checkout isn't available on this environment yet.
    </p>
  </div>
</template>
