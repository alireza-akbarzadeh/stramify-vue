<script setup lang="ts">
import type { NewsSummary } from '#shared/types/news'
import NewsCategoryBadge from './NewsCategoryBadge.vue'
import NewsCover from './NewsCover.vue'
import NewsMeta from './NewsMeta.vue'

/**
 * One article in the grid.
 *
 * The whole card is the link rather than just the headline: a 300px-wide
 * target beats a 3-word one on a phone, and it means there is exactly one
 * tab stop per card instead of three overlapping ones.
 */
defineProps<{ article: NewsSummary }>()
</script>

<template>
  <NuxtLink
    :to="article.path"
    class="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div class="relative aspect-[16/9] shrink-0">
      <NewsCover :category="article.category" :cover="article.cover" />
      <div class="absolute left-3 top-3">
        <NewsCategoryBadge :category="article.category" />
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-2 p-4">
      <h3
        class="text-balance text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
      >
        {{ article.title }}
      </h3>
      <!-- Clamped rather than truncated at a character count in the query:
           three lines is three lines whatever the words are, so a row of cards
           keeps a flat baseline instead of stepping up and down. -->
      <p class="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {{ article.description }}
      </p>
      <NewsMeta
        class="mt-auto pt-2"
        :author="article.author"
        :date="article.date"
        :reading-minutes="article.readingMinutes"
      />
    </div>
  </NuxtLink>
</template>
