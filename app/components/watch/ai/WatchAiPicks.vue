<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { useAiConfig, useWatchAiPicks } from '@/composables/useWatchAi'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { relatedToItem } from '@/utils/watchlist'
import WatchUpNextCard from '../WatchUpNextCard.vue'

/**
 * "Because you're watching this" — the same catalogue the up-next rail draws
 * from, reordered by the model, each row carrying one line of why.
 *
 * Every card here is a real row out of Postgres: the model is handed the
 * candidate list and may only choose ids from it, and `groundPicks` on the
 * server drops anything it invents (CLAUDE.md §2). So the worst case is fewer
 * picks than asked for, never a card that leads nowhere.
 *
 * No error state and no empty state — this sits directly above "Up next",
 * which is the same videos in a duller order and is always there. A red box
 * apologising for a *bonus* ranking, stacked on top of the thing it was a nicer
 * version of, is worse than the section quietly not appearing.
 */
const props = defineProps<{ slug: string }>()

const config = useAiConfig()
const enabled = computed(() => config.data.value?.enabled === true)
const picks = useWatchAiPicks(() => props.slug, enabled)

const saved = useSavedVideos()
</script>

<template>
  <section v-if="picks.isPending.value && enabled" aria-hidden="true" class="space-y-4">
    <div class="h-5 w-40 animate-pulse rounded bg-muted" />
    <div v-for="n in 3" :key="n" class="flex gap-3">
      <div class="aspect-video w-32 shrink-0 animate-pulse rounded-lg bg-muted sm:w-40" />
      <div class="flex-1 space-y-2 py-1">
        <div class="h-4 w-full animate-pulse rounded bg-muted" />
        <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  </section>

  <section v-else-if="picks.data.value?.length" aria-labelledby="ai-picks-heading">
    <h2
      id="ai-picks-heading"
      class="mb-4 flex items-center gap-2 text-base font-semibold text-foreground"
    >
      <Sparkles class="size-4 text-primary" aria-hidden="true" />
      Because you're watching this
    </h2>

    <div class="space-y-4">
      <WatchUpNextCard
        v-for="item in picks.data.value"
        :key="item.id"
        :item="item"
        :saved="saved.isSaved(item.id, item.kind)"
        @toggle-save="saved.toggle(relatedToItem(item))"
      >
        <template #note>
          <p class="mt-1 line-clamp-2 text-xs italic leading-snug text-primary/90">
            {{ item.reason }}
          </p>
        </template>
      </WatchUpNextCard>
    </div>
  </section>
</template>
