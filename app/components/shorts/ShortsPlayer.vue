<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { Short } from '#shared/types/shorts'
import { useShortsStore } from '@/stores/shorts'

/** The slice of Vidstack's player element this component drives. */
type PlayerElement = HTMLElement & {
  play: () => Promise<void>
  pause: () => Promise<void> | void
}

/**
 * One short's video surface.
 *
 * Playback is pushed onto the element rather than bound as props: `play()` is
 * a promise that can be *refused*, and a declarative `:paused` binding has
 * nowhere to put that answer — Vue would see no state change and the UI would
 * keep claiming the video is playing while it sat on its poster. The store
 * stays the single source of truth; this is the one place that reconciles it
 * with what the browser actually allowed.
 *
 * Vidstack rather than a bare `<video>` because these sources become
 * Cloudflare Stream HLS playlists in Phase 6/7, and the element already knows
 * how to play those.
 */
const props = defineProps<{ short: Short; active: boolean; loop: boolean }>()
const emit = defineEmits<{
  /** First frame played — the slide counts the view off it. */
  (e: 'play'): void
  /** Played to the end without looping — the reel advances off it. */
  (e: 'ended'): void
}>()

const shorts = useShortsStore()
const { muted, paused } = storeToRefs(shorts)
const player = useTemplateRef<PlayerElement>('player')

// A short that isn't on screen is paused, whatever the play/pause toggle says:
// the toggle belongs to the short you're looking at.
const isPaused = computed(() => !props.active || paused.value)

async function sync() {
  const el = player.value
  if (!el) return

  // The attribute, and only the attribute. Vidstack exposes `muted` as a
  // Maverick prop whose setter silently does nothing (`el.muted = true` leaves
  // the video audible), and `remoteControl.mute()` is overridden again by the
  // prop a frame later. Toggling the attribute is the one route that reaches
  // the media element — which is also why the template must not carry a
  // `muted` attribute of its own: Vue would turn it into that dead property
  // assignment before this ever runs.
  el.toggleAttribute('muted', muted.value)

  if (isPaused.value) return void el.pause()

  try {
    await el.play()
  } catch {
    // Browsers refuse to autoplay audio until the viewer has interacted with
    // the page. Dropping to muted keeps the feed moving instead of stranding
    // it on a poster; the watcher below replays this with sound off.
    if (!muted.value) shorts.muted = true
  }
}

// Three triggers, because none covers the others: the state changing after
// mount, the element existing at all, and the element becoming ready.
// Bound with `useEventListener` rather than template handlers so the listeners
// land on the custom element under their exact event names.
watch([isPaused, muted], sync)
onMounted(sync)
useEventListener(player, 'can-play', sync)
useEventListener(player, 'play', () => emit('play'))
useEventListener(player, 'end', () => emit('ended'))
</script>

<template>
  <media-player
    ref="player"
    class="shorts-player"
    :src="short.videoUrl"
    :title="short.title"
    :loop="loop"
    stream-type="on-demand"
    load="eager"
    poster-load="eager"
    playsinline
  >
    <media-provider>
      <media-poster class="shorts-poster" :src="short.posterUrl" alt="" />
    </media-provider>

    <media-time-slider class="shorts-scrubber">
      <div class="player-track" />
      <div class="player-track player-track-progress" />
      <div class="player-track player-track-fill" />
      <div class="player-thumb" />
    </media-time-slider>
  </media-player>
</template>
