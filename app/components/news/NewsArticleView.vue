<script setup lang="ts">
import type { NewsCollectionItem } from '@nuxt/content'
import type { NewsSummary } from '#shared/types/news'
import NewsArticleHeader from './NewsArticleHeader.vue'
import NewsPager from './NewsPager.vue'
import NewsToc from './NewsToc.vue'

/**
 * One article: header, rendered markdown, and the two links out of it.
 *
 * Purely presentational — the page above it owns the query, the 404 and the
 * SEO tags. This component never touches the route, which is what makes it
 * possible to render an article anywhere else later (a preview, a modal)
 * without dragging routing along.
 */
const props = defineProps<{
  page: NewsCollectionItem
  older?: { path: string; title: string } | null
  newer?: { path: string; title: string } | null
}>()

/**
 * The header takes the listing shape, so a collection row is narrowed to it
 * here rather than the header being taught about `body`, `seo`, `navigation`
 * and the rest of the page columns it would never read.
 */
const article = computed(() => props.page as unknown as NewsSummary)

const tocLinks = computed(() => props.page.body?.toc?.links ?? [])
</script>

<template>
  <div class="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-8 3xl:max-w-6xl">
    <NewsArticleHeader :article="article" />

    <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <!-- `.news-prose` is a global class, not a scoped one: ContentRenderer
           emits plain elements that no `<style scoped>` here could reach. -->
      <article class="news-prose min-w-0">
        <ContentRenderer :value="page" />
      </article>

      <!-- Hidden below `lg` rather than collapsed into an accordion: on a
           phone the jump list is longer than the scroll it saves. Sticky
           offset clears the app top bar. -->
      <aside class="hidden lg:block">
        <div class="sticky top-24">
          <NewsToc :links="tocLinks" />
        </div>
      </aside>
    </div>

    <footer class="mt-12 space-y-8">
      <ul v-if="article.tags?.length" class="flex flex-wrap gap-2">
        <li
          v-for="tag in article.tags"
          :key="tag"
          class="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          #{{ tag }}
        </li>
      </ul>

      <NewsPager :newer="newer" :older="older" />
    </footer>
  </div>
</template>
