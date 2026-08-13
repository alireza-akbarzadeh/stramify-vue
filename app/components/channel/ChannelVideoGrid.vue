<script setup lang="ts">
import type { Clip } from '#shared/types/discovery'
import type { ChannelVideoSort } from '#shared/types/channel'
import { CHANNEL_VIDEO_SORTS } from '#shared/types/channel'
import { Button } from '@/components/ui/button'
import ClipCard from '@/components/discovery/ClipCard.vue'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { clipToItem } from '@/utils/watchlist'

/**
 * A channel's clips. Reuses the discovery `ClipCard` rather than growing a
 * second card for the same object — a clip looks the same wherever it's listed.
 * Sorting is a server round trip, so the grid dims instead of unmounting while
 * the next order lands.
 */
const props = withDefaults(
  defineProps<{
    clips: Clip[]
    pending: boolean
    errored: boolean
    fetching?: boolean
    /** Hidden on the Home tab, which shows a fixed selection. */
    sortable?: boolean
    emptyMessage?: string
  }>(),
  { fetching: false, sortable: true, emptyMessage: 'This channel has not published any clips yet.' }
)

const sort = defineModel<ChannelVideoSort>('sort', { default: 'latest' })
const emit = defineEmits<{ (e: 'retry'): void }>()

const saved = useSavedVideos()
const skeletonCount = computed(() => Math.max(4, Math.min(props.clips.length || 8, 8)))
</script>

<template>
  <section class="space-y-5">
    <div v-if="sortable && (clips.length || pending)" class="flex flex-wrap items-center gap-2">
      <button
        v-for="option in CHANNEL_VIDEO_SORTS"
        :key="option.value"
        type="button"
        :aria-pressed="sort === option.value"
        :class="[
          'cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          sort === option.value
            ? 'border-primary/50 bg-primary/10 text-foreground'
            : 'border-border text-muted-foreground hover:border-white/20 hover:text-foreground'
        ]"
        @click="sort = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="pending" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="n in skeletonCount" :key="n" class="space-y-3">
        <div class="aspect-video animate-pulse rounded-lg bg-muted" />
        <div class="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>

    <div
      v-else-if="errored"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load these videos</p>
      <p class="mt-2 text-sm text-muted-foreground">Something went wrong on our side.</p>
      <Button type="button" variant="outline" size="sm" class="mt-4" @click="emit('retry')">
        Retry
      </Button>
    </div>

    <div
      v-else-if="clips.length"
      :class="[
        'grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-4',
        fetching && 'opacity-60'
      ]"
    >
      <ClipCard
        v-for="clip in clips"
        :key="clip.id"
        :clip="clip"
        :saved="saved.isSaved(clip.id, 'clip')"
        @play="navigateTo(`/watch/${encodeURIComponent(clip.id)}`)"
        @toggle-save="saved.toggle(clipToItem(clip))"
      />
    </div>

    <div v-else class="rounded-xl border border-dashed border-border py-16 text-center">
      <p class="text-lg font-semibold text-foreground">Nothing here yet</p>
      <p class="mt-2 text-sm text-muted-foreground">{{ emptyMessage }}</p>
    </div>
  </section>
</template>
