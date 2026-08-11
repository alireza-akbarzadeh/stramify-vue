<script setup lang="ts">
import { Button } from '@/components/ui/button'
import HistoryRow from './HistoryRow.vue'
import type { HistoryGroup } from '#shared/utils/history'

/**
 * The grouped list itself — day headings, rows, and the "Load more" foot.
 *
 * Presentational on purpose: it takes the groups it draws and reports what the
 * viewer did, so `HistoryView` keeps the query, the session gate and the
 * loading/empty/error branches, and this file stays about layout. It's also
 * what makes the list previewable against fixtures without a session.
 */
defineProps<{
  groups: HistoryGroup[]
  hasNextPage: boolean
  isLoadingMore: boolean
}>()

defineEmits<{ (e: 'remove', slug: string): void; (e: 'load-more'): void }>()
</script>

<template>
  <div class="space-y-8">
    <section v-for="group in groups" :key="group.key">
      <!-- Sticky under the app's own top bar (h-14, sm:h-16) rather than at 0,
           which would slide the heading behind it. Below the bar's z-30 for
           the same reason. -->
      <h2
        class="sticky top-14 z-10 -mx-2 bg-background/85 px-2 py-2 text-sm font-semibold text-foreground backdrop-blur-sm sm:top-16 sm:text-base"
      >
        {{ group.label }}
      </h2>

      <ul class="mt-1 space-y-1">
        <li v-for="item in group.items" :key="item.id">
          <HistoryRow :item="item" @remove="$emit('remove', item.slug)" />
        </li>
      </ul>
    </section>

    <div v-if="hasNextPage" class="flex justify-center pt-2">
      <Button :disabled="isLoadingMore" type="button" variant="outline" @click="$emit('load-more')">
        {{ isLoadingMore ? 'Loading…' : 'Load more' }}
      </Button>
    </div>
  </div>
</template>
