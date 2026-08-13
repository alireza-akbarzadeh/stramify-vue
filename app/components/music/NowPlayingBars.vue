<script setup lang="ts">
/**
 * The four bouncing bars that mark the card currently previewing.
 *
 * Decorative — `aria-hidden`, and the state it signals is also carried by the
 * card's own label, so nothing depends on a viewer seeing it move. The
 * keyframes live in `main.css` (`equalize`) with the rest of the app's
 * animations; only the per-bar offsets are here, because they're what make
 * four bars read as a level meter instead of one blinking block.
 *
 * `motion-reduce:animate-none` freezes them mid-height rather than hiding
 * them: the badge still says "this one is playing", it just stops moving.
 */

/** Delay and peak per bar. Deliberately not a regular pattern — an even
 *  sequence reads as a loading spinner, an uneven one reads as audio. */
const BARS = [
  { delay: '0ms', peak: 1 },
  { delay: '220ms', peak: 0.65 },
  { delay: '90ms', peak: 0.9 },
  { delay: '340ms', peak: 0.75 }
]
</script>

<template>
  <span aria-hidden="true" class="flex h-3 items-end gap-[2px]">
    <span
      v-for="(bar, index) in BARS"
      :key="index"
      class="h-full w-[3px] origin-bottom rounded-full bg-current animate-equalize motion-reduce:animate-none"
      :style="{ animationDelay: bar.delay, '--bar-peak': bar.peak }"
    />
  </span>
</template>
