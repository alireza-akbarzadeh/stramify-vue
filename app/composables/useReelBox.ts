import { useEventListener, useMediaQuery } from '@vueuse/core'
import type { Ref } from 'vue'

/** Tailwind's `sm` — below it the reel is the whole viewport and there is no box to pin to. */
const DESKTOP = '(min-width: 640px)'

/**
 * Inline `inset` for the comment drawer, taken from the reel's real edges.
 *
 * The drawer is portalled to `<body>`, so left to CSS it lays itself out
 * against the *window* while the short is centred inside the reel — which the
 * sidebar has pushed right and the up/down nav rail has trimmed. Guessing
 * either means re-deriving two widths that already move on their own (the
 * sidebar collapses, the rail hides on mobile), so this reads the element and
 * lets `mx-auto` centre inside the result.
 *
 * On desktop it pins `top`/`bottom` as well, which is what makes the drawer as
 * tall as the short instead of a fixed slab: the reel's height *is* the frame's
 * height (the frame is `h-full` inside it), so the panel lands on the video's
 * own edges. A fixed height cannot do that — the frame is sized from the
 * viewport, so any constant is the right height at exactly one window size and
 * covers half a short at every other. Below `sm` the familiar bottom sheet is
 * left alone: there the short is the whole viewport, and a drawer over all of
 * it is a different component, not a taller one.
 */
export function useReelBox(open: Ref<boolean>) {
  const isDesktop = useMediaQuery(DESKTOP)
  const rect = ref<DOMRect | null>(null)

  function measure() {
    const el = document.querySelector('[data-shorts-reel]')
    if (el) rect.value = el.getBoundingClientRect()
  }

  // Only while open: the reel's box is meaningless to a drawer nobody can see,
  // and measuring on every resize behind a closed sheet is layout thrash.
  watch(open, (isOpen) => isOpen && measure())
  useEventListener('resize', () => open.value && measure())

  return computed(() => {
    const box = rect.value
    if (!box) return undefined

    const sides = { left: `${box.left}px`, right: `${window.innerWidth - box.right}px` }
    if (!isDesktop.value) return sides

    return { ...sides, top: `${box.top}px`, bottom: `${window.innerHeight - box.bottom}px` }
  })
}
