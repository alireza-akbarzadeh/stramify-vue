<script setup lang="ts">
import { motion } from 'motion-v'
import type { MusicTrack } from '#shared/types/music'

/**
 * The hero carousel's slide picker — and its position indicator.
 *
 * One component, two presentations, because it's one job: below `sm` it's a
 * row of segments (a phone hero has no room for six thumbnails without them
 * becoming stamps you can't hit), from `sm` up it's the thumbnail strip. Both
 * report where you are, both jump to a slide, and both drain the same dwell
 * bar — splitting them into two components would mean keeping two copies of
 * that in step.
 *
 * The bar is CSS rather than `motion-v` on purpose: it's a linear fill that
 * has to pause exactly when the rotation does, which `animation-play-state`
 * does for free. `cycle` re-keys it so it restarts with the slideshow's timer
 * rather than drifting against it — see `useSlideshow`.
 */
defineProps<{
  items: MusicTrack[]
  index: number
  /** Bumped by `useSlideshow` every time the dwell window restarts. */
  cycle: number
  /** Whether the rotation is currently advancing. Freezes the bar when false. */
  running: boolean
  /** Dwell in ms, matching the slideshow's. */
  dwell: number
}>()

const emit = defineEmits<{ select: [index: number] }>()

// Shared layout id: the ring is a single element that *moves* between
// thumbnails instead of one appearing as another disappears, so a switch reads
// as the selection travelling. Spring, to match the controls.
const RING = { type: 'spring' as const, stiffness: 380, damping: 32 }
const FILL = 'block h-full w-full origin-left motion-reduce:animate-none'
</script>

<template>
  <div>
    <!-- Phone: segments. `py-2.5` is the touch target — 44px tall around a
         4px bar — without the bar itself growing into a slab. -->
    <ul class="flex items-center gap-1.5 sm:hidden">
      <li v-for="(item, i) in items" :key="item.id" class="min-w-0 flex-1">
        <button
          type="button"
          class="block w-full cursor-pointer py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          :aria-label="`Show ${item.title}`"
          :aria-current="i === index ? 'true' : undefined"
          @click="emit('select', i)"
        >
          <span class="block h-1 overflow-hidden rounded-full bg-white/25">
            <span
              v-if="i === index"
              :key="cycle"
              class="bg-white animate-[dwell_var(--dwell)_linear_forwards]"
              :class="[FILL, running ? '' : '[animation-play-state:paused]']"
              :style="{ '--dwell': `${dwell}ms` }"
            />
            <!-- Slides already passed stay lit, so the row reads as progress
                 through a queue rather than six unrelated dots. -->
            <span v-else-if="i < index" class="block h-full w-full bg-white/55" />
          </span>
        </button>
      </li>
    </ul>

    <ul class="hidden gap-3 sm:flex">
      <li
        v-for="(item, i) in items"
        :key="item.id"
        class="min-w-0 flex-1 sm:max-w-[7.5rem] lg:max-w-[8.5rem] 3xl:max-w-[10rem]"
      >
        <button
          type="button"
          class="group/thumb block w-full cursor-pointer text-left focus-visible:outline-none"
          :aria-label="`Show ${item.title}`"
          :aria-current="i === index ? 'true' : undefined"
          @click="emit('select', i)"
        >
          <span
            class="relative block overflow-hidden rounded-lg ring-1 ring-white/15 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/thumb:-translate-y-0.5 group-hover/thumb:ring-white/40 group-focus-visible/thumb:ring-2 group-focus-visible/thumb:ring-white motion-reduce:transition-none motion-reduce:group-hover/thumb:translate-y-0"
          >
            <!-- Inactive slides sit back at 55%: the strip has six frames in
                 it and all six at full strength competes with the artwork
                 they're sitting on top of. -->
            <img
              :src="item.image"
              :alt="item.title"
              width="192"
              height="108"
              loading="lazy"
              decoding="async"
              class="aspect-video w-full object-cover transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/thumb:scale-105 motion-reduce:transition-none"
              :class="i === index ? 'opacity-100' : 'opacity-70 group-hover/thumb:opacity-100'"
            />

            <motion.span
              v-if="i === index"
              layout-id="music-hero-active-slide"
              :transition="RING"
              class="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary ring-inset"
            />

            <span
              v-if="i === index"
              class="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-black/50"
            >
              <span
                :key="cycle"
                class="bg-primary animate-[dwell_var(--dwell)_linear_forwards]"
                :class="[FILL, running ? '' : '[animation-play-state:paused]']"
                :style="{ '--dwell': `${dwell}ms` }"
              />
            </span>
          </span>

          <!-- One line, and only from `lg`. A thumbnail this size is already
               the label; two shelves' worth of clamped titles under a strip of
               six reads as a wall of grey text over the artwork. -->
          <span
            class="mt-2 hidden truncate text-[11px] font-medium leading-tight transition-colors duration-200 lg:block"
            :class="i === index ? 'text-white' : 'text-white/60 group-hover/thumb:text-white/90'"
          >
            {{ item.title }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
