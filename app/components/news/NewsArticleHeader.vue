<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { NewsSummary } from '#shared/types/news'
import NewsCategoryBadge from './NewsCategoryBadge.vue'
import NewsCover from './NewsCover.vue'
import NewsMeta from './NewsMeta.vue'

/**
 * Everything above an article's first paragraph.
 *
 * The back link is a real `<NuxtLink>` to `/news` rather than a
 * `router.back()` button: an article is the kind of page people arrive at from
 * a shared link, and browser history for those readers goes somewhere else
 * entirely. The browser's own back button already covers the other case.
 */
defineProps<{ article: NewsSummary }>()
</script>

<template>
  <header>
    <NuxtLink
      to="/news"
      class="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      Newsroom
    </NuxtLink>

    <div class="mt-6 flex items-center gap-3">
      <NewsCategoryBadge :category="article.category" />
    </div>

    <h1
      class="mt-4 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
    >
      {{ article.title }}
    </h1>

    <p class="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
      {{ article.description }}
    </p>

    <div class="mt-5 flex items-center gap-3">
      <!-- The desk's initial stands in for an avatar. A byline here is a team,
           not a person, so a photograph would be a picture of nobody. -->
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold text-foreground"
        aria-hidden="true"
      >
        {{ article.author.name.charAt(0) }}
      </span>
      <div>
        <NewsMeta
          :author="article.author"
          :date="article.date"
          :reading-minutes="article.readingMinutes"
        />
        <p class="text-xs text-muted-foreground">{{ article.author.role }}</p>
      </div>
    </div>

    <div class="mt-8 aspect-[21/9] overflow-hidden rounded-2xl border border-border">
      <NewsCover :category="article.category" :cover="article.cover" eager />
    </div>
  </header>
</template>
