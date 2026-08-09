<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useWatchlistStore } from '@/stores/watchlist'
import { relatedToItem } from '@/utils/watchlist'
import HomeVideoCard from './HomeVideoCard.vue'
import type { HomeVideo } from '#shared/types/home'

/**
 * "Latest from channels you follow" — the subscriptions shelf above the feed.
 *
 * A rail rather than a grid: it's a fixed, short list (see `FOLLOWING_LIMIT`
 * on the server) that shouldn't push the recommended feed below the fold. It
 * renders the same card as the grid so a video looks identical wherever you
 * meet it on this page, just in a fixed-width slide.
 */
defineProps<{ videos: HomeVideo[] }>()

const watchlist = useWatchlistStore()
const rail = useTemplateRef<HTMLDivElement>('rail')

function scroll(direction: -1 | 1) {
  rail.value?.scrollBy({ left: direction * 640, behavior: 'smooth' })
}
</script>

<template>
  <section aria-labelledby="home-following-heading">
    <div class="mb-4 flex items-center justify-between gap-4">
      <h2 id="home-following-heading" class="text-lg font-semibold text-foreground">
        Latest from channels you follow
      </h2>
      <div class="hidden gap-2 sm:flex">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Scroll your channels left"
          class="size-9 rounded-full"
          @click="scroll(-1)"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Scroll your channels right"
          class="size-9 rounded-full"
          @click="scroll(1)"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>

    <ul
      ref="rail"
      class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none"
    >
      <li
        v-for="video in videos"
        :key="`${video.kind}-${video.id}`"
        class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
      >
        <HomeVideoCard
          :video="video"
          :saved="watchlist.isSaved(video.id)"
          @toggle-save="watchlist.toggle(relatedToItem(video))"
        />
      </li>
    </ul>
  </section>
</template>
