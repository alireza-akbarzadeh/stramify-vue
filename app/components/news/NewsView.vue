<script setup lang="ts">
import { Newspaper } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import Reveal from '@/components/motion/Reveal.vue'
import { useNewsIndex } from '@/composables/useNewsIndex'
import NewsFilters from './NewsFilters.vue'
import NewsGrid from './NewsGrid.vue'
import NewsHero from './NewsHero.vue'
import NewsSkeleton from './NewsSkeleton.vue'

/**
 * `/news` — the newsroom index.
 *
 * Owns the four states the page can be in (loading, error, nothing published,
 * loaded) and nothing else; the hero, filters and grid are presentational and
 * take what they draw. That split is what lets the "no articles" branch be
 * honest — it fires when `content/news/` is genuinely empty, not while a query
 * is still in flight.
 */
const { articles, clearFilters, error, featured, filters, isFiltered, refresh, status, visible } =
  useNewsIndex()

/** Announced to screen readers on every filter change, not just on load. */
const resultLabel = computed(() =>
  isFiltered.value
    ? `${visible.value.length} of ${articles.value.length} articles match`
    : `${articles.value.length} articles published`
)
</script>

<template>
  <div
    class="mx-auto min-w-0 max-w-[1560px] px-4 py-8 sm:px-8 3xl:max-w-[1800px] 3xl:px-10 4xl:max-w-[2400px] 4xl:px-12"
  >
    <header class="max-w-2xl">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Newsroom</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        What's new on Streamify
      </h1>
      <p class="mt-3 text-pretty leading-relaxed text-muted-foreground">
        Product releases, notes from the creator side, and the engineering calls behind them —
        including the ones we'd rather explain than hide.
      </p>
    </header>

    <NewsSkeleton v-if="status === 'pending'" class="mt-10" />

    <div
      v-else-if="status === 'error'"
      class="mt-10 rounded-2xl border border-dashed border-destructive/40 py-20 text-center"
    >
      <h2 class="text-lg font-semibold text-foreground">Couldn't load the newsroom</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {{ error?.message || 'Something went wrong on our side. Nothing is lost — try again.' }}
      </p>
      <Button class="mt-5" size="sm" type="button" variant="outline" @click="refresh()">
        Retry
      </Button>
    </div>

    <div
      v-else-if="!articles.length"
      class="mt-10 rounded-2xl border border-dashed border-border py-20 text-center"
    >
      <Newspaper class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <h2 class="mt-4 text-lg font-semibold text-foreground">Nothing published yet</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        The newsroom is empty. Once there's something worth telling you about, it lands here first.
      </p>
    </div>

    <template v-else>
      <!-- The lead story is above the fold, so it reveals nothing — the cards
           below it fade up as they're reached and carry their own stagger. -->
      <div v-if="featured && !isFiltered" class="mt-10">
        <NewsHero :article="featured" />
      </div>

      <div class="mt-10 space-y-6">
        <NewsFilters
          v-model:category="filters.category"
          v-model:query="filters.query"
        />

        <p class="text-sm text-muted-foreground" role="status">{{ resultLabel }}</p>

        <Reveal :distance="20">
          <NewsGrid :articles="visible" @clear="clearFilters" />
        </Reveal>
      </div>
    </template>
  </div>
</template>
