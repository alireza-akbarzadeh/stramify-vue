<script setup lang="ts">
import { ArrowLeft, ListVideo, Play } from '@lucide/vue'
import { useMix } from '@/composables/useMixes'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { relatedToItem } from '@/utils/watchlist'
import HomeVideoCard from '@/components/home/HomeVideoCard.vue'
import HomeVideoCardSkeleton from '@/components/home/HomeVideoCardSkeleton.vue'
import { Button } from '@/components/ui/button'

/**
 * A mix, opened. Header on the left at `lg`, contents on the right — the same
 * split a channel page uses, and it keeps "what am I looking at" pinned while
 * you scroll a long list.
 *
 * The grid reuses `HomeVideoCard`, so a video looks the same here as it does
 * on the home page it was opened from.
 */
const props = defineProps<{ id: string }>()

const { data, isPending, isError, error, refetch } = useMix(() => props.id)
const saved = useSavedVideos()

const notFound = computed(
  () => (error.value as { statusCode?: number } | null)?.statusCode === 404
)

/** "Play all" is just the first item — a real queue is Phase 12 work. */
const playAllHref = computed(() => {
  const first = data.value?.items[0]
  return first ? `/watch/${encodeURIComponent(first.slug)}` : null
})

useHead({
  title: computed(() => (data.value ? `${data.value.mix.title} — Streamify` : 'Mix — Streamify'))
})

const GRID = 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3'
const SKELETONS = 6
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
    <div v-if="notFound" class="rounded-xl border border-dashed border-border py-20 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-primary">Not available</p>
      <h1 class="mt-2 text-2xl font-semibold text-foreground">We couldn't build that mix</h1>
      <p class="mt-3 text-sm text-muted-foreground">
        The channel or category behind it doesn't have anything to play right now.
      </p>
      <Button as-child class="mt-6" size="sm">
        <NuxtLink to="/">
          <ArrowLeft />
          Back to home
        </NuxtLink>
      </Button>
    </div>

    <div
      v-else-if="isError"
      class="rounded-xl border border-dashed border-destructive/40 py-20 text-center"
    >
      <h1 class="text-lg font-semibold text-foreground">Couldn't load this mix</h1>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="refetch()">
        Retry
      </Button>
    </div>

    <div v-else class="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <header class="lg:sticky lg:top-20 lg:self-start">
        <template v-if="isPending">
          <div class="aspect-video w-full animate-pulse rounded-xl bg-muted" />
          <div class="mt-4 h-6 w-2/3 animate-pulse rounded bg-muted" />
          <div class="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
        </template>

        <template v-else-if="data">
          <div class="relative aspect-video overflow-hidden rounded-xl bg-muted">
            <img
              v-if="data.mix.covers.length"
              :src="data.mix.covers[0]"
              :alt="data.mix.title"
              class="size-full object-cover"
            />
            <div
              class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/70"
            >
              <ListVideo class="size-6 text-foreground" aria-hidden="true" />
              <span class="text-sm font-semibold text-foreground">
                {{ data.mix.count }} videos
              </span>
            </div>
          </div>

          <h1 class="mt-4 text-2xl font-semibold text-foreground">{{ data.mix.title }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ data.mix.subtitle }}</p>
          <p class="mt-3 text-xs text-muted-foreground">
            Rebuilt every time you open it, so it always reflects what's published now.
          </p>

          <Button v-if="playAllHref" as-child class="mt-4" size="sm">
            <NuxtLink :to="playAllHref">
              <Play class="fill-current" />
              Play all
            </NuxtLink>
          </Button>
        </template>
      </header>

      <section aria-label="Videos in this mix">
        <div v-if="isPending" :class="GRID" role="status" aria-label="Loading this mix">
          <HomeVideoCardSkeleton v-for="n in SKELETONS" :key="n" />
        </div>

        <div v-else-if="data" :class="GRID">
          <HomeVideoCard
            v-for="video in data.items"
            :key="`${video.kind}-${video.id}`"
            :video="video"
            :saved="saved.isSaved(video.id, video.kind)"
            :allow-feedback="false"
            @toggle-save="saved.toggle(relatedToItem(video))"
          />
        </div>
      </section>
    </div>
  </div>
</template>
