<script setup lang="ts">
import type { DashboardMetric } from '#shared/types/dashboard'

defineProps<{ metric: DashboardMetric }>()
</script>

<template>
  <!--
    `title` carries the hint rather than a Tooltip root: these render five to a
    panel, and the hint is pure clarification of what was counted. The analytics
    page, where the distinction actually matters, spells it out in visible copy.
  -->
  <div
    class="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    :title="metric.hint"
  >
    <p class="text-2xl font-semibold tabular-nums text-foreground">
      <!-- Count up from the honest integer below 1k; past that the server's
           pre-formatted "12.4k" is what should be on screen, not 12400. -->
      <CountUp v-if="metric.raw < 1000" :to="metric.raw" />
      <template v-else>{{ metric.value }}</template>
    </p>
    <p class="mt-1 text-xs text-muted-foreground">{{ metric.label }}</p>
  </div>
</template>
