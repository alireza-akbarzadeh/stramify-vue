<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import type { WatchTarget } from '#shared/types/watch'
import LiveBadge from '@/components/landing/LiveBadge.vue'
import { useTheaterMode } from '@/composables/useTheaterMode'
import PlayerControls from './player/PlayerControls.vue'

/**
 * The watch-page player: Vidstack's engine (HLS, keyboard shortcuts, focus
 * management, ARIA) under a control bar we own — see `player/` and
 * `assets/css/player.css`. Vidstack's stock `media-video-layout` is
 * deliberately not used; it looks nothing like the rest of the app.
 *
 * `media-gesture` restores the click-to-pause / double-click-to-fullscreen
 * behaviour the stock layout provided, which viewers expect from a video
 * surface and which no button on the bar covers.
 *
 * Theater mode is read here rather than passed down: `WatchLayout` widens the
 * grid cell, and `.player-theater` is only about capping the height so a wide
 * viewport can't push the video past the fold.
 */
const props = defineProps<{ target: WatchTarget }>()
/** `play-start` drives the view counter; the parent debounces it per session. */
const emit = defineEmits<{ (e: 'play-start'): void }>()

const live = computed(() => props.target.kind === 'live')
const { theater } = useTheaterMode()
</script>

<template>
  <div
    class="relative shadow-[0_24px_60px_-24px_var(--shadow-color)]"
    :class="theater && 'player-theater'"
  >
    <media-player
      class="player"
      :title="target.title"
      :src="target.videoUrl"
      :stream-type="live ? 'live' : 'on-demand'"
      playsinline
      autoplay
      @play="emit('play-start')"
    >
      <media-provider>
        <media-poster class="player-poster" :src="target.image" alt="" />
      </media-provider>

      <media-gesture event="pointerup" action="toggle:paused" />
      <media-gesture event="dblpointerup" action="toggle:fullscreen" />

      <media-captions class="player-captions" />

      <div class="player-spinner">
        <Loader2 class="size-12 animate-spin" aria-hidden="true" />
      </div>

      <PlayerControls :live="live" />
    </media-player>

    <LiveBadge v-if="live" class="pointer-events-none absolute left-4 top-4 z-30" />
  </div>
</template>
