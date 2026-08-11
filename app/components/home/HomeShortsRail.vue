<script setup lang="ts">
import HomeRail from './HomeRail.vue'
import HomeShortCard from './HomeShortCard.vue'
import type { Short } from '#shared/types/shorts'

/**
 * The Shorts shelf.
 *
 * Narrower slides than the video rails because the cards are portrait — five
 * fit across a desktop row where three landscape cards do, which is what makes
 * the shelf read as "a different kind of thing" before you've read a word of
 * it.
 */
defineProps<{ shorts: Short[] }>()
</script>

<template>
  <HomeRail heading-id="home-shorts-heading" title="Shorts" to="/shorts" to-label="See all">
    <li
      v-for="short in shorts"
      :key="short.id"
      class="w-40 shrink-0 snap-start sm:w-44"
    >
      <HomeShortCard :short="short" />
    </li>
  </HomeRail>
</template>
