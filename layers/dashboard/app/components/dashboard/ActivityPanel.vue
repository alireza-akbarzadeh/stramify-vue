<script setup lang="ts">
import { Activity } from '@lucide/vue'
import MetricTile from './MetricTile.vue'
import type { ViewerActivity } from '#shared/types/dashboard'

defineProps<{ viewer: ViewerActivity }>()
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-6" aria-labelledby="activity-heading">
    <h2 id="activity-heading" class="flex items-center gap-2 text-base font-semibold text-foreground">
      <Activity class="size-4.5" aria-hidden="true" />
      Your activity
    </h2>
    <p class="mt-1 text-sm text-muted-foreground">
      What you've done as a viewer — every count is scoped to your account.
    </p>

    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <MetricTile v-for="metric in viewer.metrics" :key="metric.key" :metric="metric" />
    </div>
  </section>
</template>
