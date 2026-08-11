<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder rows while the first page loads.
 *
 * Mirrors `HistoryRow`'s geometry — same thumbnail widths at the same
 * breakpoints — so the real list drops into the space the skeleton reserved
 * instead of shifting the page as it arrives.
 */
withDefaults(defineProps<{ rows?: number }>(), { rows: 6 })
</script>

<template>
  <div aria-label="Loading your watch history" class="space-y-3" role="status">
    <div v-for="row in rows" :key="row" class="flex gap-3 p-2 sm:gap-4">
      <Skeleton class="aspect-video w-36 shrink-0 rounded-lg sm:w-52 lg:w-60" />
      <div class="min-w-0 flex-1 space-y-2 py-1">
        <Skeleton class="h-4 w-4/5 max-w-md" />
        <Skeleton class="h-3 w-24" />
        <Skeleton class="h-3 w-40" />
      </div>
    </div>
  </div>
</template>
