<script setup lang="ts">
import { CreditCard, Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useBillingPortal } from '@/composables/useBilling'
import { billingSummary } from '#shared/utils/billing'
import type { BillingState } from '#shared/types/billing'

const props = defineProps<{ state: BillingState }>()

const summary = computed(() => billingSummary(props.state))
const { open, opening } = useBillingPortal()

const TONE_CLASS = {
  neutral: 'border-border bg-card/60',
  success: 'border-success/30 bg-success/5',
  warning: 'border-destructive/30 bg-destructive/5'
} as const
</script>

<template>
  <section :class="['rounded-2xl border p-6 backdrop-blur-xl', TONE_CLASS[summary.tone]]">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex gap-3.5">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-foreground/5 text-primary"
        >
          <CreditCard class="size-5" aria-hidden="true" />
        </span>
        <div>
          <p class="text-sm text-muted-foreground">Current plan</p>
          <h2 class="text-base font-semibold text-foreground">{{ summary.headline }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ summary.detail }}</p>
        </div>
      </div>

      <!--
        Cancelling, changing a card and downloading invoices all live in Polar's
        portal rather than being reimplemented here — those flows carry tax and
        dunning rules that a second copy would get wrong.
      -->
      <Button v-if="summary.manageable" variant="outline" :disabled="opening" @click="open">
        <Loader2 v-if="opening" class="size-4 animate-spin" aria-hidden="true" />
        Manage billing
      </Button>
    </div>
  </section>
</template>
