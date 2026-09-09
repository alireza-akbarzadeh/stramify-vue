import { useStorage } from '@vueuse/core'

/**
 * The viewer's "Autoplay" preference, as it sits on YouTube: a switch in the
 * up-next rail's header, on by default, remembered across videos and sessions.
 *
 * `useStorage` rather than `useState` because unlike theater mode this is a
 * standing preference, not a per-visit layout choice — someone who turns
 * autoplay off means it for good, and having it come back on the next morning
 * is the kind of small betrayal that makes a setting feel broken.
 *
 * Defaulting to on matches every comparable player. It is defensible precisely
 * *because* the switch is visible on the same screen as the thing it controls:
 * a default that is hard to find would be a different argument.
 */
export function useAutoplayNext() {
  const enabled = useStorage('watch:autoplay-next', true)
  return { enabled, toggle: () => (enabled.value = !enabled.value) }
}
