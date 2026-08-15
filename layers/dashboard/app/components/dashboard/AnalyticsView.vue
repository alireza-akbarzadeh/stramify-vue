<script setup lang="ts">
import { BarChart3 } from '@lucide/vue'
import { useDashboardAnalytics } from '../../composables/useDashboardAnalytics'
import CategoryMixBar from './CategoryMixBar.vue'
import DashboardError from './DashboardError.vue'
import DashboardSkeleton from './DashboardSkeleton.vue'
import RangeTabs from './RangeTabs.vue'
import TopClipsTable from './TopClipsTable.vue'
import TrendChart from './TrendChart.vue'
import type { AnalyticsRange } from '#shared/types/dashboard'

const range = ref<AnalyticsRange>('30d')
const { data, isPending, isError, refetch } = useDashboardAnalytics(range)
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <BarChart3 class="size-5" aria-hidden="true" />
          Channel analytics
        </h1>
        <p class="mt-1 text-sm text-muted-foreground" role="status">
          <template v-if="isPending">Loading your numbers…</template>
          <template v-else-if="isError">Analytics are unavailable right now.</template>
          <template v-else-if="data?.exists">Everything published under {{ data.handle }}.</template>
          <template v-else>Nothing is published under your handle yet.</template>
        </p>
      </div>
      <RangeTabs v-model="range" />
    </div>

    <DashboardSkeleton v-if="isPending" :tiles="0" :panels="3" />

    <DashboardError
      v-else-if="isError || !data"
      title="Couldn't load analytics"
      description="The server didn't return your channel numbers. Try again."
      @retry="refetch()"
    />

    <!-- No channel means no analytics — an empty chart grid would imply a
         channel that simply had a quiet month. -->
    <div
      v-else-if="!data.exists"
      class="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">No channel to measure yet</p>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Analytics appear once a clip or a live session is published under
        <span class="font-medium text-foreground">{{ data.handle || 'your handle' }}</span>.
        Creator uploads land in Phase 6 and broadcast ingest in Phase 7.
      </p>
    </div>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-border bg-card p-5">
          <TrendChart :series="data.followers" />
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <TrendChart :series="data.engagement" />
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <TopClipsTable :clips="data.topClips" />
        <CategoryMixBar :mix="data.categoryMix" />
      </div>

      <!--
        Stated, not hidden: the platform records no watch-time, retention, or
        unique-viewer data, so those charts would have to be invented.
        CLAUDE.md §2 — no fake functionality.
      -->
      <p class="text-xs text-muted-foreground">
        Watch time, retention, and unique viewers aren't shown because the platform
        doesn't record them yet — clip views are a single counter, not a session log.
        They arrive with the Phase 9 creator system.
      </p>
    </template>
  </div>
</template>
