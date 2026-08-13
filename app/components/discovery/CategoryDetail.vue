<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useDiscoveryCategoryClips } from '@/composables/useDiscoveryCategoryClips'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { clipToItem } from '@/utils/watchlist'
import ClipCard from './ClipCard.vue'

const props = defineProps<{ slug: string }>()

const { data, isPending, isError, error, refetch } = useDiscoveryCategoryClips(() => props.slug)
const saved = useSavedVideos()

const category = computed(() => data.value?.category ?? null)
const clips = computed(() => data.value?.clips ?? [])
const notFound = computed(() => (error.value as { statusCode?: number } | null)?.statusCode === 404)
</script>

<template>
  <div class="mx-auto max-w-[1560px] px-4 py-8 sm:px-8 mt-12">
    <NuxtLink
      to="/category"
      class="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      All categories
    </NuxtLink>

    <div v-if="isPending" class="mt-6 space-y-8">
      <div class="h-24 animate-pulse rounded-xl bg-muted" />
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="n in 4" :key="n" class="aspect-video animate-pulse rounded-lg bg-muted" />
      </div>
    </div>

    <div
      v-else-if="notFound"
      class="mt-6 rounded-xl border border-dashed border-border py-16 text-center"
    >
      <h1 class="text-lg font-semibold text-foreground">Category not found</h1>
      <p class="mt-2 text-sm text-muted-foreground">“{{ slug }}” isn't one of our categories.</p>
      <Button as-child variant="outline" size="sm" class="mt-4">
        <NuxtLink to="/category">Browse categories</NuxtLink>
      </Button>
    </div>

    <div
      v-else-if="isError"
      class="mt-6 rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <h1 class="text-lg font-semibold text-foreground">Couldn't load this category</h1>
      <p class="mt-2 text-sm text-muted-foreground">Something went wrong on our side.</p>
      <Button type="button" variant="outline" size="sm" class="mt-4" @click="refetch()">
        Retry
      </Button>
    </div>

    <template v-else-if="category">
      <header class="mt-6 border-b border-border pb-6">
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">{{ category.name }}</h1>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {{ category.description }}
        </p>
        <p class="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {{ category.clipCount }} {{ category.clipCount === 1 ? 'clip' : 'clips' }} ·
          {{ category.totalViews }} views
        </p>
      </header>

      <div v-if="clips.length" class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal
          v-for="(clip, index) in clips"
          :key="clip.id"
          class="h-full"
          :delay="Math.min(index, 7) * 0.04"
        >
          <ClipCard
            :clip="clip"
            :saved="saved.isSaved(clip.id, 'clip')"
            @play="navigateTo(`/watch/${encodeURIComponent(clip.id)}`)"
            @toggle-save="saved.toggle(clipToItem(clip))"
          />
        </Reveal>
      </div>
      <div v-else class="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
        <p class="text-lg font-semibold text-foreground">No clips here yet</p>
        <p class="mt-2 text-sm text-muted-foreground">
          Nothing has been published in {{ category.name }} so far.
        </p>
      </div>
    </template>
  </div>
</template>
