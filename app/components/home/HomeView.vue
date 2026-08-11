<script setup lang="ts">
import { useDiscoveryCategories } from '@/composables/useDiscoveryCategories'
import { useHomeFeed } from '@/composables/useHomeFeed'
import {
  ALL_CHIP,
  buildHomeChips,
  chipDomId,
  findHomeChip,
  homeFilterLabel
} from '#shared/utils/home'
import HomeChipBar from './HomeChipBar.vue'
import HomeShelves from './HomeShelves.vue'
import HomeVideoGrid from './HomeVideoGrid.vue'

/**
 * The signed-in-or-not home page: a category filter bar, a stack of shelves,
 * and a ranked recommendation feed.
 *
 * The shelves (continue watching, your subscriptions, shorts, mixes, your
 * playlists) live in `HomeShelves` with their own queries — five independent
 * caches that none of this file's state depends on. What's left here is the
 * two things that *are* coupled: the chip and the grid it filters.
 *
 * Search isn't here — it lives in the app bar above (`AppSearch`), which every
 * page under the dashboard layout already gets, so the home page doesn't grow
 * a second search box that behaves differently from the real one.
 */
const { data: categories, isPending: categoriesPending } = useDiscoveryCategories()

const chips = computed(() => buildHomeChips(categories.value ?? []))
const activeId = ref(ALL_CHIP.id)
const activeChip = computed(() => findHomeChip(chips.value, activeId.value))

const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useHomeFeed(activeChip)

const videos = computed(() => data.value?.pages.flatMap((page) => page.items) ?? [])

/**
 * None of the shelves is category-filtered, so they only belong above an
 * unfiltered feed — on a category chip they'd be answering a different
 * question than the grid under them.
 */
const showShelves = computed(() => activeChip.value.id === ALL_CHIP.id)

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
      <HomeShelves v-if="showShelves" />

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
