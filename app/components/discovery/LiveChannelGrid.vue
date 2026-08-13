<script setup lang="ts">
import type { LiveSignal } from '#shared/types/discovery'
import { Button } from '@/components/ui/button'
import { LIVE_CATEGORIES, type LiveCategory } from '@/utils/live'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { liveToItem } from '@/utils/watchlist'
import LiveChannelCard from './LiveChannelCard.vue'

defineProps<{
  signals: LiveSignal[]
  activeCategory: LiveCategory
}>()
const emit = defineEmits<{
  (e: 'update:activeCategory', category: LiveCategory): void
  (e: 'play', signal: LiveSignal): void
}>()

const saved = useSavedVideos()
</script>

<template>
  <section aria-labelledby="live-channels-heading">
    <div
      class="mb-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 id="live-channels-heading" class="text-lg font-semibold text-foreground">
        Streaming now
      </h2>
      <div class="flex flex-wrap gap-4" role="tablist" aria-label="Live categories">
        <Button
          v-for="category in LIVE_CATEGORIES"
          :key="category"
          type="button"
          variant="ghost"
          size="sm"
          role="tab"
          :aria-selected="activeCategory === category"
          :class="`h-auto rounded-none border-b px-1 py-1 text-xs font-semibold ${activeCategory === category ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`"
          @click="emit('update:activeCategory', category)"
        >
          {{ category }}
        </Button>
      </div>
    </div>

    <div v-if="signals.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <LiveChannelCard
        v-for="signal in signals"
        :key="signal.id"
        :signal="signal"
        :saved="saved.isSaved(signal.id, 'live')"
        @play="emit('play', signal)"
        @toggle-save="saved.toggle(liveToItem(signal))"
      />
    </div>
    <div v-else class="rounded-lg border border-dashed border-border py-16 text-center">
      <p class="text-lg font-semibold text-foreground">Nobody live here right now</p>
      <p class="mt-2 text-sm text-muted-foreground">Try another category or search term.</p>
    </div>
  </section>
</template>
