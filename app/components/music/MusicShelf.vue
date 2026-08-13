<script setup lang="ts">
import HomeRail from '@/components/home/HomeRail.vue'
import Reveal from '@/components/motion/Reveal.vue'
import MusicCard from './MusicCard.vue'
import type { MusicShelf } from '#shared/types/music'

/**
 * One rail of tracks.
 *
 * `HomeRail` rather than a second scroll track (CLAUDE.md rule 10): it already
 * owns the heading row, the arrow buttons, the snap behaviour and the
 * gutter-bleed that makes a rail feel native on a phone — all of which this
 * shelf wants unchanged. What's new is the subtitle under the heading, which
 * goes through the rail's existing `heading` slot rather than a new prop.
 *
 * Card widths are percentages so the rail shows a partial card at the right
 * edge at every breakpoint. That cut-off card is the affordance: it's what
 * tells a viewer the row scrolls, without an arrow they might not see.
 */
defineProps<{ shelf: MusicShelf }>()

const headingId = (id: string) => `music-shelf-${id}`
</script>

<template>
  <HomeRail :heading-id="headingId(shelf.id)" :title="shelf.title" :step="720">
    <template #heading="{ headingId: id }">
      <div class="min-w-0">
        <h2 :id="id" class="truncate text-xl font-semibold tracking-tight text-foreground">
          {{ shelf.title }}
        </h2>
        <p class="mt-0.5 truncate text-sm text-muted-foreground">{{ shelf.subtitle }}</p>
      </div>
    </template>

    <li
      v-for="(track, index) in shelf.items"
      :key="track.id"
      class="w-[70%] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[23.5%] 2xl:w-[19%]"
    >
      <!-- Staggered so a rail assembles left-to-right instead of flashing in
           as a block. Capped inside `Reveal`'s consumers elsewhere for the same
           reason it's capped here: past the eighth card the delay is longer
           than the scroll it takes to reach it. -->
      <Reveal :delay="Math.min(index, 7) * 0.045" :distance="16">
        <MusicCard :track="track" />
      </Reveal>
    </li>
  </HomeRail>
</template>
