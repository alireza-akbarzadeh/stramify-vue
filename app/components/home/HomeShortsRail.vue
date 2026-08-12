<script setup lang="ts">
import HomeRail from './HomeRail.vue'
import HomeShortCard from './HomeShortCard.vue'
import type { Short } from '#shared/types/shorts'

/**
 * "Shorts" — the one shelf on the home page that isn't more 16:9.
 *
 * Runs through `HomeRail` like every other shelf. It used to be a bespoke
 * coverflow: absolutely-positioned cards springing between five hand-tuned
 * offsets, neighbours parked at 28% opacity and blurred, its own arrow buttons,
 * its own dot pagination, a `text-2xl` heading with a subtitle no other shelf
 * has, and a drag handler competing with the page's vertical scroll. It looked
 * like a different product wedged into the page, and the cost wasn't only
 * visual — only one of ten cards was reachable at a time (the other nine were
 * `tabindex="-1"`), the whole row re-animated on every step, and there was no
 * `prefers-reduced-motion` path out of it.
 *
 * The native scroll track fixes all of that for free: every card is a real
 * tab stop, touch and keyboard scrolling are the browser's, and the arrows are
 * a convenience on top rather than the only way through.
 *
 * "See all" goes to `/shorts` — the full-screen feed. Every other shelf offers
 * an onward journey and this one, which has the most obvious destination on the
 * page, was the only one that didn't.
 */
defineProps<{ shorts: Short[] }>()

/**
 * Three cards per press (160px card + 16px gap). `HomeRail`'s 640px default is
 * tuned to landscape cards and would fly past four of these.
 */
const STEP = 528
</script>

<template>
  <HomeRail
    heading-id="home-shorts-heading"
    title="Shorts"
    to="/shorts"
    to-label="See all"
    :step="STEP"
  >
    <li v-for="short in shorts" :key="short.id" class="w-36 shrink-0 snap-start sm:w-40">
      <HomeShortCard :short="short" />
    </li>
  </HomeRail>
</template>
