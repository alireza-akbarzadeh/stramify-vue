<script setup lang="ts">
import type { Clip, ClipCategory } from '#shared/types/discovery'
import { Button } from '@/components/ui/button'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { clipToItem } from '@/utils/watchlist'
import ClipCard from './ClipCard.vue'

type Category = ClipCategory | 'All Clips'

const categories: Category[] = ['All Clips', 'Music', 'Gaming', 'Creative']

defineProps<{
  clips: Clip[]
  activeCategory: Category
}>()
const emit = defineEmits<{
  (e: 'update:activeCategory', category: Category): void
  (e: 'play', clip: Clip): void
}>()

const saved = useSavedVideos()
</script>

<template>
  <section aria-labelledby="highlights-heading">
    <div
      class="mb-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 id="highlights-heading" class="text-lg font-semibold text-foreground">Top Highlights</h2>
      <div class="flex flex-wrap gap-4" role="tablist" aria-label="Highlight categories">
        <Button
          v-for="category in categories"
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

    <div v-if="clips.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <ClipCard
        v-for="clip in clips"
        :key="clip.id"
        :clip="clip"
        :saved="saved.isSaved(clip.id, 'clip')"
        @play="emit('play', clip)"
        @toggle-save="saved.toggle(clipToItem(clip))"
      />
    </div>
    <div v-else class="rounded-lg border border-dashed border-border py-16 text-center">
      <p class="text-lg font-semibold text-foreground">No signals found</p>
      <p class="mt-2 text-sm text-muted-foreground">Try another category or search term.</p>
    </div>
  </section>
</template>
