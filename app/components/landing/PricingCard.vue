<script setup lang="ts">
import { Check, Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { BillingInterval, Plan } from '#shared/types/billing'

const props = defineProps<{
  plan: Plan
  interval: BillingInterval
  cta: string
  /** The viewer is already on this tier — the button becomes a non-action. */
  current?: boolean
  /** No Polar product configured for this tier + interval on this deployment. */
  disabled?: boolean
  loading?: boolean
}>()

defineEmits<{ select: [] }>()

/** `$19` / `Free`. The catalog's `yearly` figure is already per-month. */
const price = computed(() => {
  if (!props.plan.price) return 'Free'
  return `$${props.interval === 'yearly' ? props.plan.price.yearly : props.plan.price.monthly}`
})

const period = computed(() => (props.plan.price ? '/mo' : ''))

/**
 * The free tier has nothing to check out, so it stays a link to sign-up. Every
 * paid tier is a button that opens Polar.
 */
const isFree = computed(() => !props.plan.price)
</script>

<template>
  <div
    :class="[
      'relative flex h-full flex-col rounded-2xl border p-7 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1',
      plan.featured
        ? 'border-primary/50 bg-card/80 shadow-[0_30px_70px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)]'
        : 'border-border bg-card/50 hover:border-foreground/20'
    ]"
  >
    <span
      v-if="plan.featured"
      class="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground"
    >
      Most popular
    </span>

    <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{{ plan.name }}</h3>
    <p class="mt-4 flex items-baseline gap-1">
      <span class="text-4xl font-semibold tracking-tight text-foreground">{{ price }}</span>
      <span class="text-sm text-muted-foreground">{{ period }}</span>
    </p>
    <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{{ plan.blurb }}</p>

    <ul class="mt-6 flex-1 space-y-3">
      <li v-for="f in plan.features" :key="f" class="flex items-start gap-2.5 text-sm text-foreground">
        <Check class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {{ f }}
      </li>
    </ul>

    <Button
      v-if="isFree"
      as-child
      :variant="plan.featured ? 'default' : 'outline'"
      size="lg"
      class="mt-8 w-full"
    >
      <NuxtLink to="/signup">{{ cta }}</NuxtLink>
    </Button>

    <Button
      v-else
      :variant="plan.featured ? 'default' : 'outline'"
      size="lg"
      class="mt-8 w-full"
      :disabled="disabled || current || loading"
      @click="$emit('select')"
    >
      <Loader2 v-if="loading" class="mr-2 size-4 animate-spin" aria-hidden="true" />
      {{ cta }}
    </Button>
  </div>
</template>
