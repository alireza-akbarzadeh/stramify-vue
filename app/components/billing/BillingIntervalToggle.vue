<script setup lang="ts">
/**
 * Monthly ↔ yearly switch. Extracted from `PricingSection` when
 * `/settings/billing` grew the same control — one toggle, so the saving it
 * advertises and the interval it actually selects can't drift apart.
 */
const yearly = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <span :class="['text-sm', yearly ? 'text-muted-foreground' : 'text-foreground']">Monthly</span>
    <button
      type="button"
      role="switch"
      :aria-checked="yearly"
      aria-label="Bill yearly and save 20%"
      class="relative h-6 w-11 cursor-pointer rounded-full border border-border bg-foreground/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="yearly = !yearly"
    >
      <span
        :class="[
          'absolute top-0.5 size-4.5 rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          yearly ? 'translate-x-5.5' : 'translate-x-0.5'
        ]"
      />
    </button>
    <span :class="['text-sm', yearly ? 'text-foreground' : 'text-muted-foreground']">
      Yearly
      <span class="ml-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success">
        Save 20%
      </span>
    </span>
  </div>
</template>
