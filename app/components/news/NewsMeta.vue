<script setup lang="ts">
import type { NewsAuthor } from '#shared/types/news'
import { formatNewsDate } from '#shared/utils/news'

/**
 * The byline row: who, when, how long. Shared by the card, the hero and the
 * article header so the three can't format a date three different ways.
 *
 * `<time>` with a machine-readable `datetime` rather than a bare span — the
 * published date is the one piece of metadata on this page that assistive
 * tech and crawlers both actually consume.
 */
defineProps<{ author?: NewsAuthor; date: string; readingMinutes: number }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
    <template v-if="author">
      <span class="font-medium text-foreground">{{ author.name }}</span>
      <span aria-hidden="true">·</span>
    </template>
    <time :datetime="date">{{ formatNewsDate(date) }}</time>
    <span aria-hidden="true">·</span>
    <span>{{ readingMinutes }} min read</span>
  </div>
</template>
