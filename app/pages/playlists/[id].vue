<script lang="ts" setup>
import PlaylistDetailView from '@/components/playlists/PlaylistDetailView.vue'

/**
 * `/playlists/[id]` — one playlist.
 *
 * Public and unlisted playlists open for anyone; a private one 404s for
 * everyone but its owner, and the check lives in `selectPlaylist` server-side
 * rather than in this page.
 */
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))
</script>

<template>
  <PlaylistDetailView :id="id" />
</template>
