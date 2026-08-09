<script setup lang="ts">
import { useDiscoveryCategories } from '@/composables/useDiscoveryCategories'
import { useFollowingFeed } from '@/composables/useFollowingFeed'
import { useHomeFeed } from '@/composables/useHomeFeed'
import { useAuthStore } from '@/stores/auth'
import {
  ALL_CHIP,
  buildHomeChips,
  chipDomId,
  findHomeChip,
  homeFilterLabel
} from '#shared/utils/home'
import HomeChipBar from './HomeChipBar.vue'
import HomeFollowingRail from './HomeFollowingRail.vue'
import HomeFollowingRailSkeleton from './HomeFollowingRailSkeleton.vue'
import HomeVideoGrid from './HomeVideoGrid.vue'

/**
 * The signed-in-or-not home page: a category filter bar, your subscriptions,
 * and a ranked recommendation feed.
 *
 * Search isn't here — it lives in the app bar above (`AppSearch`), which every
 * page under the dashboard layout already gets, so the home page doesn't grow
 * a second search box that behaves differently from the real one.
 */
const auth = useAuthStore()
const { data: categories, isPending: categoriesPending } = useDiscoveryCategories()

const chips = computed(() => buildHomeChips(categories.value ?? []))
const activeId = ref(ALL_CHIP.id)
const activeChip = computed(() => findHomeChip(chips.value, activeId.value))

const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useHomeFeed(activeChip)
const { data: following, isPending: followingPending } = useFollowingFeed()

const videos = computed(() => data.value?.pages.flatMap((page) => page.items) ?? [])

/**
 * The subscriptions rail is not category-filtered, so it only belongs above an
 * unfiltered feed — on a category chip it would be answering a different
 * question than the grid under it.
 */
const showFollowing = computed(() => activeChip.value.id === ALL_CHIP.id)
const followingVideos = computed(() => (showFollowing.value ? (following.value ?? []) : []))

/**
 * Gated on the session as well as the query: a disabled TanStack query stays
 * `pending` forever, so signed out this would otherwise be a rail that never
 * resolves.
 */
const followingLoading = computed(
  () => showFollowing.value && auth.isAuthenticated && followingPending.value
)

/** The chip bar and the grid are a tablist and its one panel. */
const PANEL_ID = 'home-feed-panel'
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
    <!-- Sticky under the 4rem app bar, so the filters stay reachable while you scroll. -->
    <div class="sticky top-16 z-20 -mx-4 bg-background px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <HomeChipBar
        :chips="chips"
        :active-id="activeId"
        :loading="categoriesPending"
        :panel-id="PANEL_ID"
        @select="activeId = $event.id"
      />
    </div>

    <div class="space-y-10 pt-4">
      <HomeFollowingRailSkeleton v-if="followingLoading" />
      <HomeFollowingRail v-else-if="followingVideos.length" :videos="followingVideos" />

      <HomeVideoGrid
        :videos="videos"
        :pending="isPending"
        :errored="isError"
        :has-more="!!hasNextPage"
        :loading-more="isFetchingNextPage"
        :filter-label="homeFilterLabel(activeChip)"
        :panel-id="PANEL_ID"
        :labelled-by="chipDomId(activeChip.id)"
        @retry="refetch()"
        @load-more="fetchNextPage()"
      />
    </div>
  </div>
</template>
