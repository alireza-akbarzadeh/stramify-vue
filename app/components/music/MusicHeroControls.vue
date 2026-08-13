<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pause, Play } from '@lucide/vue'
import { motion } from 'motion-v'

/**
 * Previous / pause / next for the hero carousel.
 *
 * A pause control is not decoration here: the hero rotates on its own, and
 * WCAG 2.2.2 asks for a way to stop anything that moves for more than five
 * seconds. Hovering already holds the rotation, but that's a pointer-only
 * mechanism — this is the one that works from a keyboard and on a phone.
 *
 * Glass over `background`-tinted chrome because these sit on top of artwork
 * that can be any brightness: the tint, the ring and the label are all white
 * against a blurred sample of whatever is behind them, so contrast doesn't
 * depend on the frame the video happens to be showing.
 */
defineProps<{ paused: boolean }>()

const emit = defineEmits<{ prev: []; next: []; toggle: [] }>()

// Spring rather than a duration: a press should read as something with weight
// being pushed, and springs are interruptible mid-flight — a fast double-tap
// on "next" never queues up two settling animations.
const press = { type: 'spring' as const, stiffness: 420, damping: 26 }
const BUTTON =
  'inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
</script>

<template>
  <div class="flex items-center gap-2">
    <motion.button
      type="button"
      :class="BUTTON"
      :while-hover="{ scale: 1.08 }"
      :while-press="{ scale: 0.92 }"
      :transition="press"
      aria-label="Previous track"
      @click="emit('prev')"
    >
      <ChevronLeft class="size-5" aria-hidden="true" />
    </motion.button>

    <motion.button
      type="button"
      :class="BUTTON"
      :while-hover="{ scale: 1.08 }"
      :while-press="{ scale: 0.92 }"
      :transition="press"
      :aria-label="paused ? 'Resume the carousel' : 'Pause the carousel'"
      :aria-pressed="paused"
      @click="emit('toggle')"
    >
      <!-- The glyph names what the press will do, not the current state. -->
      <Play v-if="paused" class="size-4 translate-x-px fill-current" aria-hidden="true" />
      <Pause v-else class="size-4 fill-current" aria-hidden="true" />
    </motion.button>

    <motion.button
      type="button"
      :class="BUTTON"
      :while-hover="{ scale: 1.08 }"
      :while-press="{ scale: 0.92 }"
      :transition="press"
      aria-label="Next track"
      @click="emit('next')"
    >
      <ChevronRight class="size-5" aria-hidden="true" />
    </motion.button>
  </div>
</template>
