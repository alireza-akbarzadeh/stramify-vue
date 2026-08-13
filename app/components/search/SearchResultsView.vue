<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import WatchUpNextCard from '@/components/watch/WatchUpNextCard.vue'
import { useSearch } from '@/composables/useSearch'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { relatedToItem } from '@/utils/watchlist'
import SearchChannelRow from './SearchChannelRow.vue'

/**
 * The `/search` results body. Channels first (a name match is usually what
 * someone typing a name wants), then videos — the same `RelatedItem` cards the
 * watch page's up-next rail uses, so a result behaves identically wherever you
 * meet it, watchlist button included.
 */
const props = defineProps<{ query: string }>()

const { data, isPending, isError, isFetching, refetch } = useSearch(computed(() => props.query))
const saved = useSavedVideos()

const videos = computed(() => data.value?.videos ?? [])
const channels = computed(() => data.value?.channels ?? [])
const total = computed(() => videos.value.length + channels.value.length)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">
        <template v-if="query">Results for “{{ query }}”</template>
        <template v-else>Search</template>
      </h1>
      <p class="mt-1 text-sm text-muted-foreground" role="status">
        <template v-if="!query">Type in the bar above to search videos and channels.</template>
        <template v-else-if="query.length < 2"
          >Keep typing — searches start at two characters.</template
        >
        <template v-else-if="isPending">Searching…</template>
        <template v-else-if="isError">Search is unavailable right now.</template>
        <template v-else>{{ total }} {{ total === 1 ? 'result' : 'results' }}</template>
      </p>
    </header>

    <div v-if="query.length >= 2 && isPending" class="space-y-4">
      <div v-for="n in 6" :key="n" class="flex gap-3">
        <div class="aspect-video w-40 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div class="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>

    <div
      v-else-if="isError"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't run that search</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="refetch()">
        Retry
      </Button>
    </div>

    <div
      v-else-if="query.length >= 2 && !total"
      class="rounded-xl border border-dashed border-border py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">No results for “{{ query }}”</p>
      <p class="mt-2 text-sm text-muted-foreground">
        Try a shorter word, a creator's name, or a category like Music or Gaming.
      </p>
      <Button as-child class="mt-4" size="sm" variant="outline">
        <NuxtLink to="/app/pages/explore">Browse everything</NuxtLink>
      </Button>
    </div>

    <div v-else :class="['space-y-10 transition-opacity', isFetching && 'opacity-60']">
      <section v-if="channels.length" aria-labelledby="search-channels">
        <h2 id="search-channels" class="mb-2 text-base font-semibold text-foreground">Channels</h2>
        <ul>
          <li v-for="channel in channels" :key="channel.handle">
            <SearchChannelRow :channel="channel" />
          </li>
        </ul>
      </section>

      <section v-if="videos.length" aria-labelledby="search-videos">
        <h2 id="search-videos" class="mb-4 text-base font-semibold text-foreground">Videos</h2>
        <ul class="space-y-4">
          <li v-for="video in videos" :key="video.id">
            <WatchUpNextCard
              :item="video"
              :saved="saved.isSaved(video.id, video.kind)"
              @toggle-save="saved.toggle(relatedToItem(video))"
            />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
