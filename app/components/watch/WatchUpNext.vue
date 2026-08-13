<script setup lang="ts">
import type { RelatedItem } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { relatedToItem } from '@/utils/watchlist'
import WatchUpNextCard from './WatchUpNextCard.vue'

defineProps<{
  items: RelatedItem[]
  pending: boolean
  errored: boolean
}>()
const emit = defineEmits<{ (e: 'retry'): void }>()

const saved = useSavedVideos()
</script>

<template>
  <section aria-labelledby="up-next-heading">
    <h2 id="up-next-heading" class="mb-4 text-base font-semibold text-foreground">Up next</h2>

    <div v-if="pending" class="space-y-4">
      <div v-for="n in 5" :key="n" class="flex gap-3">
        <div class="aspect-video w-32 shrink-0 animate-pulse rounded-lg bg-muted sm:w-40" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 w-full animate-pulse rounded bg-muted" />
          <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>

    <div
      v-else-if="errored"
      class="rounded-lg border border-dashed border-destructive/40 p-6 text-center"
    >
      <p class="text-sm font-medium text-foreground">Couldn't load recommendations</p>
      <Button type="button" variant="outline" size="sm" class="mt-3" @click="emit('retry')">
        Retry
      </Button>
    </div>

    <p
      v-else-if="!items.length"
      class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
    >
      Nothing else in this category yet.
    </p>

    <div v-else class="space-y-4">
      <WatchUpNextCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :saved="saved.isSaved(item.id, item.kind)"
        @toggle-save="saved.toggle(relatedToItem(item))"
      />
    </div>
  </section>
</template>
