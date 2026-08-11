<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useRemoveFromContinue } from '@/composables/useContinueWatching'
import HomeContinueCard from './HomeContinueCard.vue'
import HomeRail from './HomeRail.vue'
import type { ContinueWatchingItem } from '#shared/types/library'

/**
 * "Continue watching" — clips you started and haven't finished.
 *
 * First shelf on the page when it has anything in it: resuming something you
 * already chose beats being recommended something new, and it's the one row
 * where the viewer's own intent is already known.
 *
 * The remove mutation is owned here rather than by the parent because it's the
 * card's own affordance and nothing above this shelf reacts to it — the
 * optimistic cache update in `useRemoveFromContinue` is what makes the card
 * disappear.
 */
defineProps<{ items: ContinueWatchingItem[] }>()

const remove = useRemoveFromContinue()

function onRemove(slug: string) {
  remove.mutate(slug, {
    onError: () => toast.error("Couldn't remove that from Continue watching.")
  })
}
</script>

<template>
  <HomeRail heading-id="home-continue-heading" title="Continue watching">
    <li
      v-for="item in items"
      :key="item.id"
      class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
    >
      <HomeContinueCard :item="item" @remove="onRemove(item.slug)" />
    </li>
  </HomeRail>
</template>
