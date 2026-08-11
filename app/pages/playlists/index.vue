<script lang="ts" setup>
import PlaylistLibrary from '@/components/playlists/PlaylistLibrary.vue'

/**
 * `/playlists` — the viewer's own collections. No longer a `ComingSoon`: the
 * `playlists` and `playlist_items` tables are real, and so is everything that
 * writes to them (see `docs/playlists.md`).
 *
 * Not behind the auth middleware on purpose. The page is reachable signed out
 * and explains what playlists are with a log-in prompt, which is a better
 * landing than a redirect for someone following a nav link.
 */
definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Playlists — Streamify' })
</script>

<template>
  <PlaylistLibrary />
</template>
