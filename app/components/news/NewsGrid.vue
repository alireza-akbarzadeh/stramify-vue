<script setup lang="ts">
import { Newspaper } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import Reveal from '@/components/motion/Reveal.vue'
import type { NewsSummary } from '#shared/types/news'
import NewsCard from './NewsCard.vue'

/**
 * The article grid, plus the state where the filters match nothing.
 *
 * That empty branch is the component's real job — a grid that renders zero
 * cards silently looks like a page that failed to load, and the difference
 * matters most for the reader who mistyped a search term.
 */
defineProps<{ articles: NewsSummary[] }>()

defineEmits<{ (e: 'clear'): void }>()
</script>

<template>
  <div
    v-if="!articles.length"
    class="rounded-2xl border border-dashed border-border py-16 text-center"
  >
    <Newspaper class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
    <p class="mt-4 text-base font-semibold text-foreground">Nothing matches that</p>
    <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
      No article in the newsroom matches your search and desk filter.
    </p>
    <Button class="mt-5" size="sm" type="button" variant="outline" @click="$emit('clear')">
      Clear filters
    </Button>
  </div>

  <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
    <!-- Stagger capped at the eighth card for the same reason the rails cap
         theirs: past that the delay outlasts the scroll it takes to reach it. -->
    <Reveal
      v-for="(article, index) in articles"
      :key="article.path"
      :delay="Math.min(index, 7) * 0.045"
      :distance="16"
      class="h-full"
    >
      <NewsCard :article="article" />
    </Reveal>
  </div>
</template>
