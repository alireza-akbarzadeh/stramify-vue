import { usePreferredReducedMotion, useIntervalFn } from '@vueuse/core'

/**
 * Rotates a full window of `items` on an interval so the list always looks
 * populated (an empty-then-filling list reads as broken, not "live").
 * Pauses while off-screen.
 */
export function useTickingList<T>(items: T[], active: Ref<boolean>, everyMs = 1600) {
  const offset = ref(0)
  const reduced = usePreferredReducedMotion()

  const visible = computed(() =>
    items.map((_, i) => items[(i + offset.value) % items.length] as T)
  )

  const { pause, resume } = useIntervalFn(
    () => (offset.value = (offset.value + 1) % items.length),
    everyMs,
    { immediate: false }
  )

  watch(active, (on) => {
    if (reduced.value === 'reduce') return
    if (on) resume()
    else pause()
  })

  return { visible }
}
