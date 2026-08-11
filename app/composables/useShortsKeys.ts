import { onKeyStroke } from '@vueuse/core'
import { isShortcutBlocked } from '@/utils/keyboard'
import { useShortsStore } from '@/stores/shorts'

/**
 * Keyboard control for the reel — the half of this page that a mouse wheel and
 * a touchscreen get for free but a keyboard does not.
 *
 * `↑`/`↓` move between shorts, `space` plays and pauses, `m` mutes, `r` repeats.
 * They're the bindings the equivalent surfaces on YouTube and Instagram use,
 * and all of them stand down while the comment sheet has focus
 * (`isShortcutBlocked`) so typing "m" in a reply doesn't silence the video.
 *
 * `preventDefault` on space and the arrows is deliberate: without it the
 * browser also page-scrolls the reel, which fights the snap.
 */
export function useShortsKeys(step: (delta: number) => void) {
  const shorts = useShortsStore()

  const bind = (key: string, run: () => void) =>
    onKeyStroke(key, (event) => {
      if (isShortcutBlocked(event)) return
      event.preventDefault()
      run()
    })

  bind('ArrowDown', () => step(1))
  bind('ArrowUp', () => step(-1))
  bind(' ', () => shorts.togglePaused())
  bind('m', () => shorts.toggleMuted())
  bind('r', () => shorts.toggleRepeat())
}
