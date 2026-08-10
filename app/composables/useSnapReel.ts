import { useEventListener, usePreferredReducedMotion, useThrottleFn } from '@vueuse/core'
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
  const motion = usePreferredReducedMotion()

  const sync = useThrottleFn(() => {
    const el = container.value
    if (!el || el.clientHeight === 0) return
    index.value = Math.round(el.scrollTop / el.clientHeight)
  }, SCROLL_SAMPLE_MS)

  useEventListener(container, 'scroll', sync, { passive: true })

  /**
   * Jump to a slide, clamped to the feed. Smooth by default because the motion
   * is what tells you the feed moved by one item rather than teleporting — and
   * `auto` under `prefers-reduced-motion`, where that same travel is the thing
   * being asked for less of.
   */
  function scrollToIndex(next: number) {
    const el = container.value
    if (!el) return
    const target = Math.min(Math.max(next, 0), Math.max(count.value - 1, 0))
    el.scrollTo({
      top: target * el.clientHeight,
      behavior: motion.value === 'reduce' ? 'auto' : 'smooth'
    })
  }

  return { index, scrollToIndex, step: (delta: number) => scrollToIndex(index.value + delta) }
}
