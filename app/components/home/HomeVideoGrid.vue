<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { useHomeFeedback } from '@/composables/useHomeFeedback'
import { useSaveToWatchLater } from '@/composables/useWatchLater'
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
 * Owned here, not by the card, for the same reason the watchlist is: one
 * mutation patches every cached page, and per-card copies would be twenty-four
 * of it. Hiding a card rewrites this grid's own cache — see `useHomeFeedback`.
 */
const feedback = useHomeFeedback()

/** Owned here for the same reason the feedback mutation is — one per grid. */
const watchLater = useSaveToWatchLater()

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
  <section :id="panelId" :aria-labelledby="labelledBy" role="tabpanel">
    <h2 class="sr-only">Recommended for you</h2>

    <!-- Covers the first load *and* every filter change: each chip is its own
         query key, so switching to one that hasn't been fetched is pending
         again, and switching back to a cached one skips this entirely. -->
    <div v-if="pending" :class="GRID" aria-label="Loading recommendations" role="status">
      <HomeVideoCardSkeleton v-for="n in INITIAL_SKELETONS" :key="n" />
    </div>

    <div
      v-else-if="errored"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your feed</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="emit('retry')">
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
      <Button as-child class="mt-4" size="sm" variant="outline">
        <NuxtLink to="/app/pages/explore">Browse all clips</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <div :class="GRID">
        <HomeVideoCard
          v-for="video in videos"
          :key="`${video.kind}-${video.id}`"
          :saved="watchlist.isSaved(video.id)"
          :video="video"
          @toggle-save="watchlist.toggle(relatedToItem(video))"
          @save-later="watchLater.submit(video.id)"
          @feedback="feedback.submit($event)"
        />
        <!-- The next page lands in these slots, so the page grows downward
             instead of jumping when the request resolves. -->
        <template v-if="loadingMore">
          <HomeVideoCardSkeleton v-for="n in MORE_SKELETONS" :key="`more-${n}`" />
        </template>
      </div>

      <div v-if="hasMore" class="mt-10 flex justify-center">
        <Button :disabled="loadingMore" type="button" variant="outline" @click="emit('load-more')">
          {{ loadingMore ? 'Loading…' : 'Load more' }}
        </Button>
      </div>
    </template>
  </section>
</template>
