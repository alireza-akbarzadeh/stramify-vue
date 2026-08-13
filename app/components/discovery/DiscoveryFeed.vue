<script setup lang="ts">
import type { Clip, ClipCategory, LiveSignal, WatchlistItem } from '#shared/types/discovery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDiscoveryClips } from '@/composables/useDiscoveryClips'
import { useLiveSignals } from '@/composables/useLiveSignals'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { useWatchlistStore } from '@/stores/watchlist'
import { clipToItem } from '@/utils/watchlist'
import { Search, X } from '@lucide/vue'
import ClipGrid from './ClipGrid.vue'
import FeaturedClip from './FeaturedClip.vue'
import LiveSignalsRail from './LiveSignalsRail.vue'
import WatchlistPanel from './WatchlistPanel.vue'

type Category = ClipCategory | 'All Clips'

const {
  data: clipsData,
  isPending: clipsPending,
  isError: clipsErrored,
  refetch: refetchClips
} = useDiscoveryClips()
const { data: liveSignalsData, isPending: livePending } = useLiveSignals()
const saved = useSavedVideos()
// Still the store here, and only here: the tab's badge counts what the panel
// beside it renders, which is the on-device list. The bookmark itself goes
// through `saved` above, so a clip lands in Watch later — see `useSavedVideos`.
const watchlist = useWatchlistStore()

const view = ref<'feed' | 'watchlist'>('feed')
const search = ref('')
const activeCategory = ref<Category>('All Clips')

const clips = computed(() => clipsData.value?.clips ?? [])
const featured = computed(() => clipsData.value?.featured ?? null)
const liveSignals = computed(() => liveSignalsData.value ?? [])

const filteredClips = computed(() => {
  const query = search.value.trim().toLowerCase()
  return clips.value.filter((clip) => {
    const matchesCategory =
      activeCategory.value === 'All Clips' || clip.category === activeCategory.value
    const matchesSearch =
      !query || `${clip.title} ${clip.creator} ${clip.category}`.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })
})

/**
 * Everything playable now has a URL — `/watch/[slug]`, where the slug is a
 * clip's id or a channel's handle (ADR-014). Watchlist entries store the id
 * for clips and the creator handle for live, matching that resolution order.
 */
function openSaved(item: WatchlistItem) {
  navigateTo(`/watch/${encodeURIComponent(item.kind === 'live' ? item.creator : item.id)}`)
}
function openLive(signal: LiveSignal) {
  navigateTo(`/watch/${encodeURIComponent(signal.name)}`)
}
function openClip(clip: Clip) {
  navigateTo(`/watch/${encodeURIComponent(clip.id)}`)
}
</script>
<!-- TODO: Responsive issue -->
<template>
  <div class="mx-auto max-w-[1560px] px-4 py-8 sm:px-8 mt-12">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        class="flex gap-1 rounded-lg border border-border bg-muted p-1"
        role="tablist"
        aria-label="Highlights view"
      >
        <Button
          type="button"
          size="sm"
          :variant="view === 'feed' ? 'default' : 'ghost'"
          role="tab"
          :aria-selected="view === 'feed'"
          @click="view = 'feed'"
        >
          Feed
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="view === 'watchlist' ? 'default' : 'ghost'"
          role="tab"
          :aria-selected="view === 'watchlist'"
          @click="view = 'watchlist'"
        >
          Watchlist
          <span
            v-if="watchlist.hydrated && watchlist.items.length"
            class="ml-1 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
            >{{ watchlist.items.length }}</span
          >
        </Button>
      </div>

      <label class="group relative flex max-w-md flex-1 items-center">
        <Search
          class="absolute left-3 size-4 text-muted-foreground transition-colors group-focus-within:text-primary"
          aria-hidden="true"
        />
        <Input
          v-model="search"
          placeholder="Search clips, creators, or tags..."
          aria-label="Search clips, creators, or tags"
          class="pl-10 pr-9"
          @update:model-value="view = 'feed'"
        />
        <Button
          v-if="search"
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          class="absolute right-1 size-8"
          @click="search = ''"
        >
          <X />
        </Button>
      </label>
    </div>

    <WatchlistPanel v-if="view === 'watchlist'" @open="openSaved" @browse="view = 'feed'" />

    <template v-else>
      <div v-if="clipsPending" class="mb-12 aspect-video animate-pulse rounded-xl bg-muted" />
      <div
        v-else-if="clipsErrored"
        class="mb-12 rounded-xl border border-dashed border-destructive/40 py-16 text-center"
      >
        <p class="text-lg font-semibold text-foreground">Couldn't load highlights</p>
        <Button type="button" variant="outline" size="sm" class="mt-4" @click="refetchClips()"
          >Retry</Button
        >
      </div>
      <FeaturedClip
        v-else-if="featured"
        class="mb-12"
        :clip="featured"
        :saved="saved.isSaved(featured.id, 'clip')"
        @play="openClip(featured)"
        @toggle-save="saved.toggle(clipToItem(featured))"
      />

      <div v-if="livePending" class="mb-12 flex gap-4">
        <div
          v-for="n in 4"
          :key="n"
          class="aspect-video w-64 shrink-0 animate-pulse rounded-lg bg-muted"
        />
      </div>
      <LiveSignalsRail
        v-else-if="liveSignals.length"
        class="mb-12"
        :signals="liveSignals"
        @play="openLive"
      />

      <ClipGrid v-model:active-category="activeCategory" :clips="filteredClips" @play="openClip" />
    </template>
  </div>
</template>
