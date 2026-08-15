<script setup lang="ts">
import { ANALYTICS_RANGES } from '#shared/utils/trend'
import type { AnalyticsRange } from '#shared/types/dashboard'

const model = defineModel<AnalyticsRange>({ required: true })

const LABELS: Record<AnalyticsRange, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days'
}
</script>

<template>
  <!-- A radio group, not a tablist: nothing is being shown or hidden, one
       parameter of the same view is being chosen. -->
  <div
    class="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2/60 p-1"
    role="radiogroup"
    aria-label="Analytics date range"
  >
    <button
      v-for="range in ANALYTICS_RANGES"
      :key="range"
      type="button"
      role="radio"
      :aria-checked="model === range"
      class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="
        model === range
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="model = range"
    >
      {{ LABELS[range] }}
    </button>
  </div>
</template>
