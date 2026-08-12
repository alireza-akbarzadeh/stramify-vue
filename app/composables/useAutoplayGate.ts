import { defaultDocument, useEventListener } from '@vueuse/core'
import { useShortsStore } from '@/stores/shorts'

/**
 * Turns the sound back on the moment the viewer touches the page.
 *
 * Browsers refuse audible autoplay until a page has been interacted with, so a
 * feed that starts on its own starts silent no matter what the viewer prefers —
 * `ShortsPlayer` catches that refusal and falls back to silent playback rather
 * than leaving the short on its poster. This is the other half of that: the
 * first real gesture is exactly what the browser was waiting for, and so it is
 * also the first moment the fallback can be dropped.
 *
 * `click` and `keyup` rather than the `pointerdown`/`keydown` that grant the
 * activation, because this listener must never beat a control the viewer was
 * actually aiming at. Pressing the mute button while blocked means "give me
 * sound", and `toggleMuted` decides that by reading the current mute — so if
 * this ran first, on `pointerdown`, it would clear the block, the button would
 * see an already-unmuted feed, and the press would mute it instead. An element
 * handler runs before the document sees the bubbled `click`, and `keydown`
 * (where `useShortsKeys` binds) always precedes `keyup`, so both orderings hold
 * without depending on which composable registered first. Activation is already
 * granted by then — it is the earlier half of the same gesture.
 *
 * On the document, because user activation is per-document: any gesture
 * anywhere on the page unblocks the feed, not just one aimed at the reel.
 */
export function useAutoplayGate() {
  const shorts = useShortsStore()

  useEventListener(defaultDocument, ['click', 'keyup'], () => shorts.unblockAudio(), {
    once: true,
    passive: true
  })
}
