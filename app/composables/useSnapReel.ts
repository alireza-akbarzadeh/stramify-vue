import { useEventListener, useThrottleFn } from '@vueuse/core'
import type { Ref } from 'vue'

/** Roughly one frame at 60fps under a scroll, which is fast enough to feel exact. */
const SCROLL_SAMPLE_MS = 80

/**
 * Which slide of a full-height scroll-snap column is on screen, and how to
 * move to another one.
 *
 * Derived from `scrollTop / clientHeight` rather than an IntersectionObserver:
 * every slide is exactly one container tall and snapped, so that division *is*
 * the index — no thresholds to tune, no observer per slide, and it stays
 * correct mid-flick instead of waiting for an intersection to cross 50%.
 *
 * `container` is the scroller, not the page. Shorts scroll inside their own
 * box so the app's sidebar and top bar stay put, which is also what stops the
 * feed from fighting the browser's own overscroll.
 */
export function useSnapReel(container: Ref<HTMLElement | null>, count: Ref<number>) {
  const index = ref(0)

  const sync = useThrottleFn(() => {
    const el = container.value
    if (!el || el.clientHeight === 0) return
    index.value = Math.round(el.scrollTop / el.clientHeight)
  }, SCROLL_SAMPLE_MS)

  useEventListener(container, 'scroll', sync, { passive: true })

  /**
   * Jump to a slide, clamped to the feed.
   *
   * Always smooth — including under `prefers-reduced-motion`, which this
   * deliberately does not honour. The travel is what says "the feed moved on by
   * one"; without it a keypress or an auto-advance is indistinguishable from
   * the video being swapped out underneath you, which reads as a glitch rather
   * than as less motion. Browser scroll snapping doesn't stand down for the
   * preference either, so honouring it here bought no calm — it only made the
   * keyboard and auto-advance paths jump while a wheel flick glided.
   */
  function scrollToIndex(next: number) {
    const el = container.value
    if (!el) return
    const target = Math.min(Math.max(next, 0), Math.max(count.value - 1, 0))
    el.scrollTo({ top: target * el.clientHeight, behavior: 'smooth' })
  }

  return { index, scrollToIndex, step: (delta: number) => scrollToIndex(index.value + delta) }
}
