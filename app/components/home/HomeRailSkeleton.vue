<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import HomeVideoCardSkeleton from './HomeVideoCardSkeleton.vue'

/**
 * Placeholder for any home shelf while its query is in flight.
 *
 * It reserves the rail's height so the grid underneath doesn't get shoved down
 * when the real rail arrives. The heading bar sits in the same `text-lg` line
 * box as `HomeRail`'s `h2` and the slides are the same width as the cards that
 * replace them, so the swap costs zero pixels of movement.
 *
 * Generalised from `HomeFollowingRailSkeleton`, which was the same markup back
 * when the subscriptions rail was the only shelf on the page.
 */
withDefaults(defineProps<{ count?: number }>(), { count: 4 })
</script>

<template>
  <section aria-hidden="true">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex h-[1.75rem] items-center">
        <Skeleton class="h-[0.85em] w-64 max-w-[70vw] text-lg" />
      </div>
      <div class="hidden gap-2 sm:flex">
        <Skeleton class="size-9 rounded-full" />
        <Skeleton class="size-9 rounded-full" />
      </div>
    </div>

    <div class="flex gap-4 overflow-hidden pb-2">
      <div v-for="n in count" :key="n" class="w-[calc(100%-2rem)] shrink-0 sm:w-72">
        <HomeVideoCardSkeleton />
      </div>
    </div>
  </section>
</template>
