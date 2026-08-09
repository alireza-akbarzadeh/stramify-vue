<script setup lang="ts">
import HomeView from '@/components/home/HomeView.vue'

/**
 * `/` is the app's home feed, not the marketing site — that moved to
 * `/marketing`. It renders for signed-out visitors too: the ranking falls back
 * to popularity alone when there's no session to personalise against.
 */
definePageMeta({ layout: 'dashboard' })

useHead({
  title: 'Streamify — Watch live streams and clips',
  meta: [
    {
      name: 'description',
      content:
        'Your feed of live streams and clips, ranked by what people are watching and the channels you follow. Filter by category or search across every channel.'
    }
  ]
})
</script>

<template>
  <HomeView />
</template>
