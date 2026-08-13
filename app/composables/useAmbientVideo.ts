import {
  useDocumentVisibility,
  useIntersectionObserver,
  usePreferredReducedMotion
} from '@vueuse/core'
import { canPreviewSource } from '@/utils/preview'

/**
 * A muted, looping video playing quietly behind hero artwork.
 *
 * Distinct from `useHoverPreview` in every way that matters, which is why it
 * isn't a flag on it: there's no pointer intent to wait for, no single-slot
 * arbitration, no window to end after, and it loops. What the two genuinely
 * share is `canPreviewSource`, and that's shared.
 *
 * It stops when it isn't being watched — scrolled out of view, or the tab
 * backgrounded. A hero video still decoding frames three screens above the
 * viewport is pure battery cost, and browsers throttle background tabs
 * unevenly enough that it's worth being explicit rather than hoping.
 */
export function useAmbientVideo(source: () => string | null) {
  const video = useTemplateRef<HTMLVideoElement>('ambientVideo')
  const root = useTemplateRef<HTMLElement>('ambientRoot')

  /** True once frames are actually on screen — the crossfade hangs off this. */
  const playing = ref(false)
  const failed = ref(false)

  const reducedMotion = usePreferredReducedMotion()
  const visibility = useDocumentVisibility()
  const inView = ref(false)

  /**
   * Only ever true on the client, and only after hydration.
   *
   * That `hydrated` term is load-bearing, not caution: `usePreferredReducedMotion`
   * can't know the preference during SSR and reports `no-preference`, so a
   * server render would emit the `<video>` and a client that *does* prefer
   * reduced motion would immediately drop it — a hydration mismatch on the
   * page's largest element. Rendering the still on the server and adding the
   * loop afterwards sidesteps it, and hands the LCP the image either way.
   */
  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })

  /**
   * Reduced motion opts out completely: an ambient loop is decoration the
   * viewer didn't ask for, so it becomes a still (PROMPT.md §17).
   */
  const allowed = computed(
    () => hydrated.value && !!source() && !failed.value && reducedMotion.value !== 'reduce'
  )
  const shouldPlay = computed(() => allowed.value && inView.value && visibility.value === 'visible')

  useIntersectionObserver(
    root,
    ([entry]) => {
      inView.value = !!entry?.isIntersecting
    },
    // A hero is tall; a sliver on screen isn't worth decoding for.
    { threshold: 0.25 }
  )

  watch(shouldPlay, (play) => {
    const el = video.value
    if (!el) return

    if (!play) {
      el.pause()
      playing.value = false
      return
    }
    void attempt(el)
  })

  async function attempt(el: HTMLVideoElement) {
    const url = source()
    if (!url || !canPreviewSource(url, (type) => el.canPlayType(type))) {
      failed.value = true
      return
    }

    try {
      await el.play()
      playing.value = true
    } catch {
      // Autoplay refused even muted (some privacy modes). The still behind it
      // is a perfectly good hero, so this is a non-event.
      failed.value = true
      playing.value = false
    }
  }

  /** Metadata is the earliest point the element can be asked to play. */
  function onLoadedMetadata() {
    if (shouldPlay.value && video.value) void attempt(video.value)
  }

  function onError() {
    failed.value = true
    playing.value = false
  }

  onBeforeUnmount(() => video.value?.pause())

  return { video, root, playing, allowed, onLoadedMetadata, onError }
}
