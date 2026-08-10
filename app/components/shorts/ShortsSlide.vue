<script setup lang="ts">
import { Play, Volume2, VolumeX } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import type { Short } from '#shared/types/shorts'
import { useShortsStore } from '@/stores/shorts'
import { useViewCounter } from '@/composables/useViewCounter'
import ShortsActionRail from './ShortsActionRail.vue'
import ShortsOverlay from './ShortsOverlay.vue'
import ShortsPlayer from './ShortsPlayer.vue'

/**
 * One full-height slide of the reel.
 *
 * `distance` is how many shorts away from the one on screen this is, and it
 * decides whether a player is mounted at all: the active short plus its two
 * neighbours, so scrolling either way starts from a warm buffer, and
 * everything past that is a poster. Mounting fifteen media elements would mean
 * fifteen simultaneous downloads for one visible video.
 *
 * The frame is 9:16 with a blurred, scaled copy of the poster behind it, which
 * is what fills a desktop viewport that is nothing like 9:16 without either
 * cropping the video or leaving two black slabs.
 */
const props = defineProps<{ short: Short; distance: number; last: boolean }>()
/** Played to the end — the reel decides where the feed goes next. */
const emit = defineEmits<{ (e: 'ended'): void }>()

const shorts = useShortsStore()
const { muted, paused, held } = storeToRefs(shorts)
const { count } = useViewCounter(() => props.short.id)

const active = computed(() => props.distance === 0)
const loaded = computed(() => props.distance <= 1)
const showPaused = computed(() => active.value && paused.value)

/**
 * Loop instead of ending — which is what stops the feed advancing, since a
 * looping video never fires `end`.
 *
 * Two reasons to hold still: the viewer tapped this short (`held`), or there
 * is nothing after it. Scrolling off the last short would land on empty space.
 */
const loop = computed(() => (active.value && held.value) || props.last)
</script>

<template>
  <article
    class="relative flex h-full w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden"
    :aria-label="`${short.title} by ${short.channel}`"
  >
    <img
      :src="short.posterUrl"
      alt=""
      aria-hidden="true"
      loading="lazy"
      class="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-30 blur-2xl"
    />

    <div
      class="relative h-full w-full overflow-hidden bg-black sm:aspect-[9/16] sm:h-full sm:w-auto sm:rounded-2xl sm:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]"
    >
      <ShortsPlayer
        v-if="loaded"
        :short="short"
        :active="active"
        :loop="loop"
        @play="count()"
        @ended="emit('ended')"
      />
      <img
        v-else
        :src="short.posterUrl"
        :alt="short.title"
        loading="lazy"
        class="absolute inset-0 size-full object-contain"
      />

      <!--
        The tap surface, under the overlay and the rail so their controls stay
        clickable. A real button rather than a click handler on a div: this is
        the primary control of the page and it has to be reachable by keyboard
        and announced for what it does.
      -->
      <button
        type="button"
        class="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        :aria-label="paused ? `Play ${short.title}` : `Pause ${short.title}`"
        @click="shorts.togglePaused()"
      />

      <Transition
        enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
        enter-from-class="scale-90 opacity-0"
        leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
        leave-to-class="scale-110 opacity-0"
      >
        <span
          v-if="showPaused"
          class="pointer-events-none absolute inset-0 z-20 grid place-items-center"
          aria-hidden="true"
        >
          <span class="grid size-16 place-items-center rounded-full bg-black/55 backdrop-blur-md">
            <Play class="size-8 fill-white text-white" />
          </span>
        </span>
      </Transition>

      <button
        v-if="active"
        type="button"
        class="absolute right-3 top-3 z-30 grid size-10 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        :aria-label="muted ? 'Unmute (m)' : 'Mute (m)'"
        :aria-pressed="muted"
        @click="shorts.toggleMuted()"
      >
        <component :is="muted ? VolumeX : Volume2" class="size-5" aria-hidden="true" />
      </button>

      <ShortsOverlay :short="short" />
      <ShortsActionRail :short="short" class="absolute bottom-28 right-2 z-30" />
    </div>
  </article>
</template>
