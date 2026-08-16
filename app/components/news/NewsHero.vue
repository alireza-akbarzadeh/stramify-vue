<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { NewsSummary } from '#shared/types/news'
import NewsCategoryBadge from './NewsCategoryBadge.vue'
import NewsCover from './NewsCover.vue'
import NewsMeta from './NewsMeta.vue'

/**
 * The lead story.
 *
 * Side-by-side from `lg` and stacked below it, with the cover first in the DOM
 * either way — on a phone the image is what tells you this block is one story
 * rather than a page header, and reordering it with CSS would put it after the
 * headline for a screen reader for no gain.
 */
defineProps<{ article: NewsSummary }>()
</script>

<template>
  <NuxtLink
    :to="article.path"
    class="group grid overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:grid-cols-2"
  >
    <div class="relative aspect-[16/9] lg:aspect-auto lg:min-h-[22rem]">
      <NewsCover :category="article.category" :cover="article.cover" eager />
    </div>

    <div class="flex flex-col justify-center gap-4 p-6 sm:p-8">
      <div class="flex items-center gap-2">
        <NewsCategoryBadge :category="article.category" />
        <span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Latest
        </span>
      </div>

      <h2
        class="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl"
      >
        {{ article.title }}
      </h2>

      <p class="text-pretty leading-relaxed text-muted-foreground">{{ article.description }}</p>

      <NewsMeta
        :author="article.author"
        :date="article.date"
        :reading-minutes="article.readingMinutes"
      />

      <span class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        Read the story
        <ArrowRight
          class="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </span>
    </div>
  </NuxtLink>
</template>
