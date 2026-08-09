<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useWatchlistStore } from '@/stores/watchlist'
import { relatedToItem } from '@/utils/watchlist'
import HomeVideoCard from './HomeVideoCard.vue'
import HomeVideoCardSkeleton from './HomeVideoCardSkeleton.vue'
import type { HomeVideo } from '#shared/types/home'

/**
 * The recommended grid and its four states: loading, failed, empty, and
 * results with a "Load more" tail.
 *
 * The watchlist store is read here rather than passed down, the same way
 * `ClipGrid` does it — every card needs its own saved flag, and threading a
 * lookup function through props would only move the coupling.
 */
defineProps<{
  videos: HomeVideo[]
  pending: boolean
  errored: boolean
  hasMore: boolean
  loadingMore: boolean
  /** Shown in the empty state — "nothing in <this filter> yet". */
  filterLabel: string
  /** This grid is the chip bar's tab panel; see `HomeChipBar`. */
  panelId: string
  /** DOM id of the chip currently selecting this content. */
  labelledBy: string
}>()
const emit = defineEmits<{ (e: 'retry' | 'load-more'): void }>()

const watchlist = useWatchlistStore()

/**
 * One literal, used by the real grid and by both skeleton grids, so a
 * placeholder can never sit in a different column count than the cards
 * replacing it. Written out in full because Tailwind scans source text —
 * a composed string wouldn't be seen.
 */
const GRID = 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

/** A first screenful — enough to fill four columns twice over. */
const INITIAL_SKELETONS = 8
/** The tail while a next page is in flight; the button says the rest. */
const MORE_SKELETONS = 4
</script>

<template>
  <section :id="panelId" role="tabpanel" :aria-labelledby="labelledBy">
    <h2 class="sr-only">Recommended for you</h2>

    <!-- Covers the first load *and* every filter change: each chip is its own
         query key, so switching to one that hasn't been fetched is pending
         again, and switching back to a cached one skips this entirely. -->
    <div v-if="pending" :class="GRID" role="status" aria-label="Loading recommendations">
      <HomeVideoCardSkeleton v-for="n in INITIAL_SKELETONS" :key="n" />
    </div>

    <div
      v-else-if="errored"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your feed</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button type="button" variant="outline" size="sm" class="mt-4" @click="emit('retry')">
        Retry
      </Button>
    </div>

    <div
      v-else-if="!videos.length"
      class="rounded-xl border border-dashed border-border py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Nothing in {{ filterLabel }} yet</p>
      <p class="mt-2 text-sm text-muted-foreground">
        Try another filter, or browse everything that's been published.
      </p>
      <Button as-child variant="outline" size="sm" class="mt-4">
        <NuxtLink to="/clips">Browse all clips</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <div :class="GRID">
        <HomeVideoCard
          v-for="video in videos"
          :key="`${video.kind}-${video.id}`"
          :video="video"
          :saved="watchlist.isSaved(video.id)"
          @toggle-save="watchlist.toggle(relatedToItem(video))"
        />
        <!-- The next page lands in these slots, so the page grows downward
             instead of jumping when the request resolves. -->
        <template v-if="loadingMore">
          <HomeVideoCardSkeleton v-for="n in MORE_SKELETONS" :key="`more-${n}`" />
        </template>
      </div>

      <div v-if="hasMore" class="mt-10 flex justify-center">
        <Button type="button" variant="outline" :disabled="loadingMore" @click="emit('load-more')">
          {{ loadingMore ? 'Loading…' : 'Load more' }}
        </Button>
      </div>
    </template>
  </section>
</template>
