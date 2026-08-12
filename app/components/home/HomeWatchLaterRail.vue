<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useRemoveFromWatchLater } from '@/composables/useWatchLater'
import HomeRail from './HomeRail.vue'
import HomeWatchLaterCard from './HomeWatchLaterCard.vue'
import type { WatchLaterItem } from '#shared/types/library'

/**
 * "Watch later" — the last ten videos this viewer saved, newest save first.
 *
 * The queue's own shelf rather than a slot in the playlists rail below: these
 * are videos, not collections, and a card that opened a *list* would be a
 * different click from every other card on this page.
 *
 * The heading links to `/watch-later` for the rest of the queue. The remove
 * mutation is owned here for the same reason `HomeContinueRail` owns its own:
 * it's the card's affordance, and the optimistic cache update in
 * `useRemoveFromWatchLater` is what makes the card disappear.
 */
defineProps<{ items: WatchLaterItem[] }>()

const remove = useRemoveFromWatchLater()

function onRemove(clipId: string) {
  remove.mutate(clipId, {
    onError: () => toast.error("Couldn't remove that from Watch later.")
  })
}
</script>

<template>
  <HomeRail
    heading-id="home-watch-later-heading"
    title="Watch later"
    to="/watch-later"
    to-label="See all"
  >
    <li
      v-for="item in items"
      :key="item.id"
      class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
    >
      <HomeWatchLaterCard :item="item" @remove="onRemove(item.id)" />
    </li>
  </HomeRail>
</template>
