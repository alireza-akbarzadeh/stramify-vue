<script lang="ts" setup>
import NewsArticleView from '@/components/news/NewsArticleView.vue'

/**
 * `/news/<slug>` — one article, resolved by path against the `news`
 * collection. A catch-all rather than `[slug].vue` so a future
 * `content/news/2027/…` folder addresses correctly without a routing change.
 *
 * Both queries are awaited rather than lazy (unlike the index): an article
 * page whose entire content arrives after render is an empty page for
 * crawlers, and the 404 below has to be decided before anything is drawn.
 */
definePageMeta({ layout: 'dashboard' })

const route = useRoute()

const { data: page } = await useAsyncData(`news:${route.path}`, () =>
  queryCollection('news').path(route.path).first()
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found', fatal: true })
}

/**
 * Ordered oldest-first so the pair reads chronologically: `[0]` is the article
 * published before this one, `[1]` the one after. Either can be null — the
 * newest and oldest articles each only have one neighbour — and `NewsPager`
 * renders one link rather than a dead half-row when that happens.
 */
const { data: surroundings } = await useAsyncData(`news:${route.path}:surroundings`, () =>
  queryCollectionItemSurroundings('news', route.path).order('date', 'ASC')
)

const older = computed(() => surroundings.value?.[0] ?? null)
const newer = computed(() => surroundings.value?.[1] ?? null)

/**
 * `useSeoMeta` rather than the `useHead` the rest of the app uses: this is the
 * one surface built to be linked from somewhere else, so the Open Graph and
 * article tags are the point rather than a nicety.
 */
useSeoMeta({
  title: () => `${page.value?.title} — Streamify`,
  description: () => page.value?.description,
  ogTitle: () => page.value?.title,
  ogDescription: () => page.value?.description,
  ogType: 'article',
  articlePublishedTime: () => String(page.value?.date ?? ''),
  articleSection: () => page.value?.category,
  articleTag: () => page.value?.tags ?? []
})
</script>

<template>
  <NewsArticleView v-if="page" :newer="newer" :older="older" :page="page" />
</template>
