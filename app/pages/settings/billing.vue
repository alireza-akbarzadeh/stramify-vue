<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useBilling, useCheckoutReturn } from '@/composables/useBilling'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Billing — Streamify' })

const { data: billing, isPending, isError, refetch } = useBilling()
const { confirming } = useCheckoutReturn()

const yearly = ref(false)
const interval = computed(() => (yearly.value ? 'yearly' : 'monthly') as const)
</script>

<template>
  <div class="relative min-h-dvh bg-background">
    <div class="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p class="mt-2 text-muted-foreground">Your plan, payment method and invoices.</p>
      </Reveal>

      <!-- Landing back from Polar: the webhook may still be in flight. -->
      <Reveal v-if="confirming" :delay="0.06">
        <section
          class="mt-10 flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground"
        >
          <Loader2 class="size-4 animate-spin text-primary" aria-hidden="true" />
          Confirming your payment…
        </section>
      </Reveal>

      <Reveal v-else-if="isPending" :delay="0.06">
        <div class="mt-10 h-28 animate-pulse rounded-2xl border border-border bg-card/40" />
      </Reveal>

      <Reveal v-else-if="isError" :delay="0.06">
        <section class="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p class="text-sm text-foreground">We couldn't load your plan.</p>
          <Button variant="outline" class="mt-4" @click="() => refetch()">Try again</Button>
        </section>
      </Reveal>

      <Reveal v-else-if="billing" :delay="0.06">
        <BillingStatusCard :state="billing" class="mt-10" />
      </Reveal>

      <Reveal :delay="0.12">
        <div class="mt-14">
          <h2 class="text-center text-lg font-semibold text-foreground">Change plan</h2>
          <BillingIntervalToggle v-model="yearly" class="mt-6" />
        </div>
      </Reveal>

      <BillingPlanGrid :interval="interval" class="mt-10" />
    </div>
  </div>
</template>
