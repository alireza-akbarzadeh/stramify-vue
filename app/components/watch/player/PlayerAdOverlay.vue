<script setup lang="ts">
import { ExternalLink, SkipForward } from '@lucide/vue'
import type { AdBreak } from '#shared/types/ads'
import { canSkipAd, secondsUntilSkip } from '#shared/types/ads'

const props = defineProps<{ ad: AdBreak; elapsed: number }>()
const emit = defineEmits<{ (e: 'skip'): void }>()

const skippable = computed(() => canSkipAd(props.elapsed, props.ad.skipAfterSeconds))
const waiting = computed(() => secondsUntilSkip(props.elapsed, props.ad.skipAfterSeconds))

/** Whole seconds of creative left, for the "Ad · 0:12" readout. */
const remaining = computed(() => Math.max(0, Math.ceil(props.ad.durationSeconds - props.elapsed)))
const clock = computed(() => {
  const total = remaining.value
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
})

/** How far through the creative we are, for the progress bar under the video. */
const progress = computed(() =>
  props.ad.durationSeconds > 0
    ? Math.min(100, (props.elapsed / props.ad.durationSeconds) * 100)
    : 0
)
</script>

<template>
  <!--
    `pointer-events-none` on the frame with `pointer-events-auto` on the two
    controls: everything else stays click-through so the `media-gesture`
    underneath still pauses the ad, the way it does on the video itself.
  -->
  <div class="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between">
    <div class="flex items-start justify-between gap-3 p-3 sm:p-4">
      <div class="flex items-center gap-2">
        <span
          class="rounded-sm bg-warning px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black"
        >
          Ad
        </span>
        <span class="text-xs font-medium text-white drop-shadow-sm">{{ clock }}</span>
      </div>

      <a
        :href="ad.clickUrl"
        target="_blank"
        rel="noopener noreferrer sponsored"
        class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ExternalLink aria-hidden="true" class="size-3.5" />
        <span class="max-w-40 truncate">{{ ad.advertiser }}</span>
      </a>
    </div>

    <div class="flex items-end justify-end p-3 sm:p-4">
      <!--
        One element in both states rather than a v-if swap, so the countdown
        does not shift position at the moment it becomes a button — the pointer
        is often already resting on it by then.
      -->
      <button
        :aria-label="skippable ? 'Skip this ad' : `Skip available in ${waiting} seconds`"
        :class="[
          'pointer-events-auto inline-flex min-w-32 items-center justify-center gap-2 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors',
          skippable
            ? 'cursor-pointer bg-black/70 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
            : 'cursor-default bg-black/50'
        ]"
        :disabled="!skippable"
        type="button"
        @click="skippable && emit('skip')"
      >
        <template v-if="skippable">
          Skip ad
          <SkipForward aria-hidden="true" class="size-4" />
        </template>
        <template v-else>Skip in {{ waiting }}</template>
      </button>
    </div>

    <!-- Sits where the scrubber would be, so the ad reads as "playing", not stalled. -->
    <div class="absolute inset-x-0 bottom-0 h-1 bg-white/20">
      <div class="h-full bg-warning transition-[width] duration-200" :style="{ width: `${progress}%` }" />
    </div>
  </div>
</template>
