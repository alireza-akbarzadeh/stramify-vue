<script setup lang="ts">
import HomeVideoCardSkeleton from '@/components/home/HomeVideoCardSkeleton.vue'
import { Button } from '@/components/ui/button'
import LikedCard from './LikedCard.vue'
import type { LikedItem } from '#shared/types/library'

/**
 * The wall of liked videos, plus the skeletons and the "Load more" tail.
 *
 * A grid rather than the rows `/history` uses, for the reason `WatchLaterView`
 * gives: history is chronological and you scan down it, a library is a set of
 * things you're choosing between and a wall of thumbnails is how you choose.
 *
 * Presentational on purpose — it takes what it draws and reports what the
 * viewer did, so `LikedView` keeps the query, the session gate and the
 * empty/error branches. It owns the *loading* branch, though, because that's
 * the one state that has to be laid out on the same grid as the cards.
 */
defineProps<{
  items: LikedItem[]
  /** First page in flight, or a fresh search/sort that isn't cached yet. */
  pending: boolean
  hasNextPage: boolean
  isLoadingMore: boolean
}>()

defineEmits<{ (e: 'remove', clipId: string): void; (e: 'load-more'): void }>()

/**
 * One literal, used by the real grid and the skeleton one, so a placeholder can
 * never sit in a different column count than the cards replacing it. Written
 * out in full because Tailwind scans source text — a composed string wouldn't
 * be seen. Same columns as `HomeVideoGrid`, so a video looks the same size
 * wherever the viewer meets it.
 */
const GRID = 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

/** A first screenful — enough to fill four columns twice over. */
const INITIAL_SKELETONS = 8
/** The tail while a next page is in flight; the button says the rest. */
const MORE_SKELETONS = 4
</script>

<template>
  <!-- Covers the first load *and* every filter change: each term and order is
       its own query key, so switching to one that hasn't been fetched is
       pending again, and switching back to a cached one skips this entirely. -->
  <div v-if="pending" :class="GRID" aria-label="Loading your liked videos" role="status">
    <HomeVideoCardSkeleton v-for="n in INITIAL_SKELETONS" :key="n" />
  </div>

  <template v-else>
    <div :class="GRID">
      <LikedCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        @remove="$emit('remove', item.id)"
      />
      <!-- The next page lands in these slots, so the page grows downward
           instead of jumping when the request resolves. -->
      <template v-if="isLoadingMore">
        <HomeVideoCardSkeleton v-for="n in MORE_SKELETONS" :key="`more-${n}`" />
      </template>
    </div>

    <div v-if="hasNextPage" class="mt-10 flex justify-center">
      <Button
        :disabled="isLoadingMore"
        type="button"
        variant="outline"
        @click="$emit('load-more')"
      >
        {{ isLoadingMore ? 'Loading…' : 'Load more' }}
      </Button>
    </div>
  </template>
</template>
