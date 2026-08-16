<script lang="ts" setup>
import NewsView from '@/components/news/NewsView.vue'

/**
 * `/news` — the newsroom index. Content comes from `content/news/*.md` rather
 * than the database; see ADR-034 and `docs/news.md`.
 */
definePageMeta({ layout: 'dashboard' })

useSeoMeta({
  title: 'News — Streamify',
  description:
    'Product releases, creator updates and engineering notes from the team building Streamify.',
  ogTitle: 'Streamify Newsroom',
  ogDescription:
    'Product releases, creator updates and engineering notes from the team building Streamify.',
  ogType: 'website'
})
</script>

<template>
  <NewsView />
</template>
