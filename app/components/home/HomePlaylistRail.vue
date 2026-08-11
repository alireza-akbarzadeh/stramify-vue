<script setup lang="ts">
import HomeRail from './HomeRail.vue'
import PlaylistCard from '@/components/playlists/PlaylistCard.vue'
import type { PlaylistSummary } from '#shared/types/library'

/**
 * "Your playlists" — the library, one row of it, on the home page.
 *
 * The cards aren't deletable here. Deleting cascades and can't be undone, so
 * it belongs on `/playlists` where you went deliberately to manage them, not
 * behind a hover menu on a shelf you scrolled past. The "See all" link is the
 * route to that page.
 */
defineProps<{ playlists: PlaylistSummary[] }>()
</script>

<template>
  <HomeRail
    heading-id="home-playlists-heading"
    title="Your playlists"
    to="/playlists"
    to-label="See all"
  >
    <li
      v-for="playlist in playlists"
      :key="playlist.id"
      class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
    >
      <PlaylistCard :playlist="playlist" />
    </li>
  </HomeRail>
</template>
