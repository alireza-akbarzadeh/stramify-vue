<script setup lang="ts">
import { useHomeFeedback } from '@/composables/useHomeFeedback'
import { useSaveToWatchLater } from '@/composables/useWatchLater'
import { useWatchlistStore } from '@/stores/watchlist'
import { relatedToItem } from '@/utils/watchlist'
import HomeRail from './HomeRail.vue'
import HomeVideoCard from './HomeVideoCard.vue'
import type { HomeVideo } from '#shared/types/home'

/**
 * "Latest from channels you follow" — the subscriptions shelf above the feed.
 *
 * A rail rather than a grid: it's a fixed, short list (see `FOLLOWING_LIMIT`
 * on the server) that shouldn't push the recommended feed below the fold. It
 * renders the same card as the grid so a video looks identical wherever you
 * meet it on this page, just in a fixed-width slide.
 *
 * The rail chrome (heading, arrows, scroll track) is `HomeRail`, shared with
 * every other shelf on this page.
 */
defineProps<{ videos: HomeVideo[] }>()

const watchlist = useWatchlistStore()
// The same mutation the grid below uses — one press clears the video from both.
const feedback = useHomeFeedback()
const watchLater = useSaveToWatchLater()
</script>

<template>
  <HomeRail heading-id="home-following-heading" title="Latest from channels you follow">
    <li
      v-for="video in videos"
      :key="`${video.kind}-${video.id}`"
      class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
    >
      <HomeVideoCard
        :video="video"
        :saved="watchlist.isSaved(video.id)"
        @toggle-save="watchlist.toggle(relatedToItem(video))"
        @save-later="watchLater.submit(video.id)"
        @feedback="feedback.submit($event)"
      />
    </li>
  </HomeRail>
</template>
