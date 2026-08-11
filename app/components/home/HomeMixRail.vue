<script setup lang="ts">
import HomeMixCard from './HomeMixCard.vue'
import HomeRail from './HomeRail.vue'
import type { MixSummary } from '#shared/types/mix'

/**
 * "Mixes for you" — one shelf of openable lists, seeded by the channels and
 * categories the viewer leans on.
 *
 * Sits below the personal shelves and above the ranked grid: a mix is an
 * invitation to keep watching a *kind* of thing, which is a weaker signal than
 * "you didn't finish this" but a stronger one than "this is popular".
 */
defineProps<{ mixes: MixSummary[] }>()
</script>

<template>
  <HomeRail heading-id="home-mixes-heading" title="Mixes for you">
    <li v-for="mix in mixes" :key="mix.id" class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72">
      <HomeMixCard :mix="mix" />
    </li>
  </HomeRail>
</template>
