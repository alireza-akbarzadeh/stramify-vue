<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useRemoveFromHistory } from '@/composables/useHistory'
import HomeHistoryCard from './HomeHistoryCard.vue'
import HomeRail from './HomeRail.vue'
import type { HistoryItem } from '#shared/types/history'

/**
 * "Recently watched" — the last ten videos this viewer opened, finished or not.
 *
 * Deliberately *not* a duplicate of the Continue-watching rail above it, and it
 * sits directly below so the difference is legible: that shelf is what you can
 * resume (started, unfinished, past the fifteen-second mark), this one is what
 * you've been watching — finished clips included, and the ones you sampled for
 * ten seconds too. Same table, different question; see `server/utils/history.ts`.
 *
 * The heading links to `/history`, where the full list is searchable and grouped
 * by day. A rail can't do either, so it shouldn't pretend to be the whole page.
 *
 * The remove mutation is owned here rather than by the parent because it's the
 * card's own affordance and nothing above this shelf reacts to it.
 */
defineProps<{ items: HistoryItem[] }>()

const remove = useRemoveFromHistory()

function onRemove(slug: string) {
  remove.mutate(slug, {
    onError: () => toast.error("Couldn't remove that from your history.")
  })
}
</script>

<template>
  <HomeRail
    heading-id="home-history-heading"
    title="Recently watched"
    to="/history"
    to-label="See all"
  >
    <li
      v-for="item in items"
      :key="item.id"
      class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
    >
      <HomeHistoryCard :item="item" @remove="onRemove(item.slug)" />
    </li>
  </HomeRail>
</template>
