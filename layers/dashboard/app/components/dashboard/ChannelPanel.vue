<script setup lang="ts">
import { Radio, Upload, Video } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import MetricTile from './MetricTile.vue'
import type { CreatorOverview } from '#shared/types/dashboard'

defineProps<{ creator: CreatorOverview }>()
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-6" aria-labelledby="channel-heading">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 id="channel-heading" class="flex items-center gap-2 text-base font-semibold text-foreground">
          <Video class="size-4.5" aria-hidden="true" />
          Your channel
        </h2>
        <p class="mt-1 truncate text-sm text-muted-foreground">
          <template v-if="creator.exists">Published as <span class="font-medium text-foreground">{{ creator.handle }}</span></template>
          <template v-else>No channel is publishing under your handle yet.</template>
        </p>
      </div>

      <!--
        The LIVE chip is the one "real-time monitoring" signal on this page that
        is genuinely live: it means a `live_streams` row currently carries this
        handle. Viewer counts on it are still seeded (ADR-013), so they are not
        surfaced here as if they were ticking.
      -->
      <NuxtLink
        v-if="creator.isLive && creator.liveSlug"
        :to="`/watch/${creator.liveSlug}`"
        class="inline-flex shrink-0 items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span class="relative grid size-2 place-items-center" aria-hidden="true">
          <span class="absolute size-2 animate-ping rounded-full bg-destructive motion-reduce:animate-none" />
          <span class="size-2 rounded-full bg-destructive" />
        </span>
        Live now
      </NuxtLink>
    </div>

    <div v-if="creator.exists" class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricTile v-for="metric in creator.metrics" :key="metric.key" :metric="metric" />
    </div>

    <!--
      Real empty state, not a grid of zeroes. A handle with no clips and no live
      session isn't a channel with no traffic — it's a channel that doesn't
      exist, and saying "0 views" would imply otherwise.
    -->
    <div v-else class="mt-6 rounded-xl border border-dashed border-border bg-surface-2/50 px-5 py-8 text-center">
      <span class="mx-auto grid size-11 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
        <Upload class="size-5" aria-hidden="true" />
      </span>
      <p class="mt-3 text-sm font-medium text-foreground">Nothing published under “{{ creator.handle || 'your handle' }}” yet</p>
      <p class="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Channel identity is your display name — clips and live sessions match on it.
        Creator uploads and broadcast ingest arrive in Phase 6/7; until then this
        panel fills in as soon as content carries your handle.
      </p>
      <Button as-child size="sm" variant="outline" class="mt-4">
        <NuxtLink to="/dashboard/stream">
          <Radio class="size-4" aria-hidden="true" />
          Set up streaming
        </NuxtLink>
      </Button>
    </div>
  </section>
</template>
