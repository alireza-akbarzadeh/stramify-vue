<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder for the story rail.
 *
 * Same box model as `FollowingStoryCircle` down to the circle diameter and the
 * label's line box, so the real rail lands without moving the shelves below it
 * — the same contract `HomeRailSkeleton` keeps for the video rails.
 */
withDefaults(defineProps<{ count?: number }>(), { count: 8 })
</script>

<template>
  <section aria-hidden="true">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex h-[1.75rem] items-center">
        <Skeleton class="h-[0.85em] w-48 max-w-[70vw] text-lg" />
      </div>
      <div class="hidden gap-2 sm:flex">
        <Skeleton class="size-9 rounded-full" />
        <Skeleton class="size-9 rounded-full" />
      </div>
    </div>

    <div class="flex gap-4 overflow-hidden pb-2">
      <div
        v-for="n in count"
        :key="n"
        class="flex w-[4.5rem] shrink-0 flex-col items-center gap-2 sm:w-20"
      >
        <Skeleton class="size-[4.5rem] rounded-full sm:size-20" />
        <Skeleton class="h-3 w-12" />
      </div>
    </div>
  </section>
</template>
