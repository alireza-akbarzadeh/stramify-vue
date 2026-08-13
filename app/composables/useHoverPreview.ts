import { useMediaQuery, usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import { canPreviewSource, previewStartTime, PREVIEW_SECONDS } from '@/utils/preview'

/**
 * Hover-to-play for a card: after a beat of deliberate hovering, the still
 * crossfades into a muted few seconds of the actual track.
 *
 * The rules this encodes, and why each one is here:
 *
 * - **Intent delay before anything loads.** Sweeping the cursor across a rail
 *   crosses six cards; firing on contact would open six video connections for
 *   a gesture that meant none of them. Nothing is requested until the pointer
 *   has settled (`ARM_MS`).
 * - **One preview on the page at a time.** `activeCard` is module-level, so
 *   arming a second card stops the first. Without it a slow drag down a grid
 *   leaves a trail of playing videos, which is both a bandwidth problem and a
 *   visual mess.
 * - **Muted, always.** Audible autoplay is blocked until the page has been
 *   interacted with, and a browse page that starts making noise under the
 *   cursor is hostile even when it's allowed. Sound is what `/watch` is for.
 * - **Fine pointers only.** `hover: hover` excludes touch, where "hover" is
 *   really a tap and a preview would fight the navigation the tap meant. On a
 *   phone the card is just a link, which is the correct behaviour there.
 * - **Reduced motion opts out entirely.** A video starting on its own is
 *   motion the viewer didn't ask for, so this returns a permanently idle
 *   machine — not a slower one (PROMPT.md §17).
 *
 * The card stays fully readable and clickable in every one of those opt-out
 * paths: the preview is an enhancement over the still, never the thing that
 * makes the card work.
 */

/** How long the pointer has to settle before a preview is worth loading. */
const ARM_MS = 450

/**
 * The card currently previewing, as a module-level token. A plain `ref` rather
 * than a Pinia store: nothing outside these cards reads it, it never needs to
 * survive a route change, and a store for one shared symbol would be
 * ceremony (CLAUDE.md rule 3).
 */
const activeCard = ref<symbol | null>(null)

export type PreviewState = 'idle' | 'arming' | 'loading' | 'playing'

export function useHoverPreview(source: () => string) {
  const token = Symbol('preview-card')
  /** Matches `ref="previewVideo"` on the `<video>` the card renders. */
  const video = useTemplateRef<HTMLVideoElement>('previewVideo')

  const state = ref<PreviewState>('idle')
  /** 0→1 across the preview window, for the progress line under the card. */
  const progress = ref(0)
  /**
   * Set once a source has been ruled out (unsupported type, or a load error).
   * Sticky on purpose — retrying an HLS source on a browser that can't play it
   * would fail identically every hover.
   */
  const unsupported = ref(false)

  const reducedMotion = usePreferredReducedMotion()
  /**
   * Excludes touch, where the browser fires a synthetic hover on tap — a
   * preview there would start at the same moment the tap navigates away.
   * SSR-safe: `useMediaQuery` reports `false` on the server, so the markup
   * hydrates identically and the capability is only consulted client-side.
   */
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')

  const enabled = computed(
    () => finePointer.value && reducedMotion.value !== 'reduce' && !unsupported.value
  )

  /**
   * Whether the video should be *visible*. Strictly later than `mounted`: the
   * element buffers behind the still first, so the crossfade lands on a
   * playing frame instead of a black one.
   */
  const showVideo = computed(() => state.value === 'playing')
  /** Whether the element should exist at all — an idle rail holds none. */
  const mounted = computed(() => state.value === 'loading' || state.value === 'playing')

  const { start: arm, stop: disarm } = useTimeoutFn(begin, ARM_MS, { immediate: false })

  function enter() {
    if (!enabled.value || !source()) return
    state.value = 'arming'
    arm()
  }

  function leave() {
    disarm()
    stop()
  }

  /** The intent delay elapsed: claim the page's single preview slot and load. */
  function begin() {
    activeCard.value = token
    state.value = 'loading'
    progress.value = 0
  }

  function stop() {
    disarm()
    if (activeCard.value === token) activeCard.value = null

    // Idle *before* the element is touched, and not after: detaching a source
    // can itself fire `error`, and with the state still reading `playing` at
    // that point `onError` would mark a perfectly good track `unsupported` and
    // the card would never preview again. The guard there keys off this.
    state.value = 'idle'
    progress.value = 0

    const el = video.value
    if (!el) return

    el.pause()
    // Drop the buffer rather than leaving a paused element holding it: a rail
    // the viewer has swept twice would otherwise pin a dozen decoded videos in
    // memory. Removing the attribute before `load()` is what releases the
    // resource — `load()` alone would just re-fetch the same src.
    el.removeAttribute('src')
    el.load()
  }

  /**
   * Metadata arrived: check the source is really playable here, seek past the
   * intro, and start. `canPreviewSource` already filtered by extension, but a
   * browser can still refuse a container it nominally supports.
   */
  async function onLoadedMetadata() {
    const el = video.value
    if (!el || state.value !== 'loading') return

    if (!canPreviewSource(source(), (type) => el.canPlayType(type))) {
      unsupported.value = true
      stop()
      return
    }

    // Belt and braces: the `muted` *content attribute* seeds `defaultMuted`,
    // and every autoplay policy gates on the `muted` *property*. Setting it
    // outright removes the single most common reason a silent preview gets
    // refused, and costs one assignment.
    el.muted = true
    el.currentTime = previewStartTime(el.duration)

    try {
      await el.play()
      // A `leave` can land during that await; don't resurrect a stopped card.
      if (state.value === 'loading') state.value = 'playing'
      else el.pause()
    } catch {
      // Autoplay refused despite `muted` (some privacy modes), or the element
      // was torn down mid-play. Either way the still is a fine outcome.
      stop()
    }
  }

  /**
   * Drives the progress line and ends the window. `timeupdate` rather than a
   * rAF loop: it fires ~4×/s, which is plenty for a 9-second bar and costs
   * nothing per frame.
   */
  function onTimeUpdate() {
    const el = video.value
    if (!el || state.value !== 'playing') return

    const elapsed = el.currentTime - previewStartTime(el.duration)
    progress.value = Math.min(1, Math.max(0, elapsed / PREVIEW_SECONDS))

    if (elapsed >= PREVIEW_SECONDS) stop()
  }

  /**
   * A dead source shouldn't keep re-arming on every pass of the cursor — so a
   * genuine failure is sticky. An `error` raised while already idle is the
   * teardown in `stop()` detaching the source, not the track failing, and
   * marking that `unsupported` would disable the card after its first
   * successful preview.
   */
  function onError() {
    if (state.value === 'idle') return
    unsupported.value = true
    stop()
  }

  // Another card claimed the slot — yield it.
  watch(activeCard, (current) => {
    if (current !== token && state.value !== 'idle') stop()
  })

  onBeforeUnmount(stop)

  return {
    /** Bind to the `<video ref="preview">` inside the card. */
    video,
    state,
    progress,
    mounted,
    showVideo,
    enabled,
    enter,
    leave,
    onLoadedMetadata,
    onTimeUpdate,
    onError
  }
}
