<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { Short } from '#shared/types/shorts'
import { useShortsStore } from '@/stores/shorts'

/** The slice of Vidstack's player element this component drives. */
type PlayerElement = HTMLElement & {
  muted: boolean
  state: { canPlay: boolean }
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

/**
 * Push the store's state onto the element. Deliberately synchronous: two of
 * these can be in flight for the same short (a scroll and a `can-play` land in
 * the same frame), and an `await` anywhere above the play/pause call lets an
 * older `pause()` resume *after* a newer `play()` and leave the short sitting
 * on its poster.
 */
function sync() {
  const el = player.value
  if (!el) return

  // Both routes, because each covers a half of the element's life that the
  // other cannot. The attribute goes first and above the readiness guard: it is
  // what Vidstack reads when it builds its initial state, so it is the only way
  // the very first `<video>` can be created already muted — which is what the
  // `NotAllowedError` fallback below needs on its second pass, since by then
  // the element may still be mid-upgrade.
  el.toggleAttribute('muted', muted.value)

  // `state` is Vidstack's own, so its absence means the custom element hasn't
  // been upgraded yet — and until it has, `<media-player>` is an inert
  // `HTMLElement` on which every route in is a silent no-op. `can-play` runs
  // this again once the element is real.
  if (!el.state) return

  // The property is the half the attribute cannot do: once the element exists,
  // a changed `muted` attribute is never reflected onto the `<video>`, which is
  // how a short ends up playing audible behind a muted icon. It reads back
  // stale because Vidstack routes it through a media *request* rather than
  // assigning it — that is expected, and why the attribute above still matters.
  el.muted = muted.value

  // Vidstack throws straight out of `play()` and `pause()` until the provider
  // is ready ("media is not ready — wait for `can-play`"), and at this call
  // site that throw is indistinguishable from a browser refusing autoplay.
  // Standing down until `can-play` — which runs this again — is what keeps the
  // `catch` below meaning only the one thing it says it means. The mute above
  // is deliberately outside this guard: Vidstack queues it until the provider
  // exists, so it still lands on the very first frame.
  if (!el.state.canPlay) return

  if (isPaused.value) return void el.pause()

  el.play().catch((error: unknown) => {
    // Browsers refuse to autoplay audio until the viewer has interacted with
    // the page, and `NotAllowedError` is the only name they give that refusal.
    // Narrow, because everything else — a provider that isn't ready, a source
    // that failed — is a bug to see, not a reason to silence a feed.
    if ((error as DOMException | null)?.name !== 'NotAllowedError') return
    // Dropping to silent playback keeps the feed moving instead of stranding it
    // on a poster; the watcher below replays this with sound off. It goes to
    // the store's block rather than the viewer's saved preference, so the
    // browser's refusal lasts exactly as long as the browser enforces it —
    // `useAutoplayGate` lifts it on the first gesture.
    shorts.blockAudio()
  })
}

// Four triggers, because none of them covers the others: the state changing
// after mount, the element existing at all, the element becoming ready, and —
// the one that is easy to leave out — playback actually starting. Vidstack
// settles the provider's own `muted` somewhere after `can-play`, so a mute set
// before that is quietly overwritten, and without this last re-assert the feed
// opens with sound on behind a muted icon.
// Bound with `useEventListener` rather than template handlers so the listeners
// land on the custom element under their exact event names.
watch([isPaused, muted], sync)
onMounted(sync)
useEventListener(player, 'can-play', sync)
useEventListener(player, 'playing', sync)
useEventListener(player, 'play', () => emit('play'))
// `ended`, not Vidstack's `end`: `end` fires every time the playhead reaches
// the finish *including* when `loop` sends it back to the start, so listening
// on it advances the feed off the very shorts that asked to stay put. `ended`
// is the one Vidstack withholds while looping.
useEventListener(player, 'ended', () => emit('ended'))
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
