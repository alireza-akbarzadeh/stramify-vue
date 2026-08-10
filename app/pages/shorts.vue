<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Shorts — Streamify' })

/**
 * `?v=<clip id>` is read once, at setup, and handed down as a plain string.
 *
 * It has to be a snapshot: the reel rewrites this query on every scroll so the
 * address bar names the short on screen, and a reactive read would feed that
 * straight back into the feed's query key and refetch the whole thing.
 */
const startId = (useRoute().query.v as string | undefined) ?? null
</script>

<template>
  <ShortsView :start-id="startId" />
</template>
