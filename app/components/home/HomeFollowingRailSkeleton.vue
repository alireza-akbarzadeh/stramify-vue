<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import HomeVideoCardSkeleton from './HomeVideoCardSkeleton.vue'

/**
 * Placeholder for the subscriptions rail, shown only while a signed-in
 * viewer's follows are still loading.
 *
 * It reserves the rail's height so the grid underneath doesn't get shoved
 * down when the rail arrives. Slide widths match `HomeFollowingRail`'s
 * exactly; the heading is a bar of the same `text-lg` line box as the real
 * one so the two don't differ by a pixel either.
 */
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
      <div v-for="n in 4" :key="n" class="w-[calc(100%-2rem)] shrink-0 sm:w-72">
        <HomeVideoCardSkeleton />
      </div>
    </div>
  </section>
</template>
