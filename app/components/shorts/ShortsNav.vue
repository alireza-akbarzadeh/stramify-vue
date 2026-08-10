<script setup lang="ts">
import { ChevronDown, ChevronUp } from '@lucide/vue'

/**
 * Previous/next, for pointers. A wheel and a swipe already move the reel;
 * a mouse without a wheel, a trackpad user who expects a click target, and
 * anyone discovering that this page scrolls at all do not.
 *
 * Hidden below `sm`, where the same two moves are a swipe and the buttons
 * would only cover the video.
 */
defineProps<{ atStart: boolean; atEnd: boolean }>()
const emit = defineEmits<{ (e: 'step', delta: number): void }>()

const base =
  'grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-surface-2 text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <div class="hidden shrink-0 flex-col justify-center gap-3 pr-4 sm:flex">
    <button type="button" :class="base" :disabled="atStart" aria-label="Previous short (up arrow)" @click="emit('step', -1)">
      <ChevronUp class="size-5" aria-hidden="true" />
    </button>
    <button type="button" :class="base" :disabled="atEnd" aria-label="Next short (down arrow)" @click="emit('step', 1)">
      <ChevronDown class="size-5" aria-hidden="true" />
    </button>
  </div>
</template>
