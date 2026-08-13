import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/stores/auth'
import { checkoutSlug } from '#shared/types/billing'
import type { BillingInterval, BillingState, CheckoutSlug, PaidTier } from '#shared/types/billing'

/** Everything billing caches. One invalidation covers the pricing page and settings. */
export const BILLING_KEY = ['billing']

interface BillingResponse extends BillingState {
  available: CheckoutSlug[]
}

/**
 * The viewer's plan (ADR-026).
 *
 * Not gated on the session, unlike the personalised shelves: the endpoint
 * answers Starter for a visitor, and the pricing page needs that answer —
 * `billingEnabled` and `available` are deployment facts, not user facts, and
 * without them a signed-out pricing page can't tell a plan it can sell from one
 * it can't.
 *
 * `staleTime: 0` because the one moment this is read is the moment it changes:
 * Polar redirects back to `/settings/billing` immediately after checkout, and a
 * cached "Starter" there reads as a payment that didn't take.
 */
export function useBilling() {
  return useQuery({
    queryKey: BILLING_KEY,
    staleTime: 0,
    queryFn: () => $fetch<BillingResponse>('/api/billing/subscription')
  })
}

/**
 * Start a Polar checkout, or explain why it can't.
 *
 * No mutation and no cache update, because this leaves the app — `checkout()`
 * redirects to Polar's hosted page. State comes back through the webhook, and
 * the success URL lands on `/settings/billing`, which refetches.
 */
export function useCheckout() {
  const auth = useAuthStore()
  const pending = ref<CheckoutSlug | null>(null)

  async function start(tier: PaidTier, interval: BillingInterval) {
    const slug = checkoutSlug(tier, interval)

    // Checkout is `authenticatedUsersOnly` server-side, so an anonymous attempt
    // would 401 out of the redirect. Send them to sign up and bring them back
    // to the plan they picked rather than dropping them on the home page.
    if (!auth.isAuthenticated) {
      return navigateTo(`/signup?redirect=${encodeURIComponent(`/settings/billing?plan=${slug}`)}`)
    }

    pending.value = slug
    try {
      await authClient.checkout({ slug })
    } catch {
      // Only reached if the redirect never happens — a slug with no product on
      // this deployment, or Polar being unreachable.
      toast.error("Couldn't open checkout. Please try again.")
    } finally {
      pending.value = null
    }
  }

  return { start, pending }
}

/** How long to wait for the webhook before showing the plan as-is. */
const CONFIRM_ATTEMPTS = 5
const CONFIRM_INTERVAL_MS = 1500

/**
 * Settle the `?checkout_id=` landing that Polar redirects to after payment.
 *
 * The redirect fires as soon as the payment clears, which regularly beats the
 * `subscription.created` webhook that fills our mirror — so a plain read here
 * shows "Starter" to someone who just paid. This polls the mirror for a few
 * seconds instead, and gives up quietly rather than claiming failure: the
 * webhook will land, and the page will be right on the next visit.
 *
 * The query param is stripped once handled so a refresh doesn't re-run it.
 */
export function useCheckoutReturn() {
  const route = useRoute()
  const queryClient = useQueryClient()
  const confirming = ref(false)

  async function confirm() {
    for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
      await queryClient.refetchQueries({ queryKey: BILLING_KEY })
      const state = queryClient.getQueryData<BillingResponse>(BILLING_KEY)
      if (state && state.tier !== 'starter') {
        toast.success(`You're on ${state.tier === 'studio' ? 'Studio' : 'Creator'}.`)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIRM_INTERVAL_MS))
    }
  }

  onMounted(async () => {
    if (!route.query.checkout_id) return
    confirming.value = true
    await confirm()
    confirming.value = false
    await navigateTo({ query: {} }, { replace: true })
  })

  return { confirming }
}

/**
 * Open Polar's customer portal — the one place to change a card, download an
 * invoice or cancel. Deliberately not reimplemented in-app: those flows carry
 * tax and dunning rules that would be a second, worse copy of Polar's.
 */
export function useBillingPortal() {
  const opening = ref(false)

  async function open() {
    opening.value = true
    try {
      await authClient.customer.portal()
    } catch {
      toast.error("Couldn't open the billing portal. Please try again.")
    } finally {
      opening.value = false
    }
  }

  return { open, opening }
}
