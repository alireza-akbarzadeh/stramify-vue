import { useDocumentVisibility, useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'

/**
 * A carousel that advances itself — and knows every reason it shouldn't.
 *
 * It holds while the pointer or keyboard focus is inside it, while the tab is
 * in the background, and while the viewer has pressed pause. `prefers-reduced-
 * motion: reduce` opts out of auto-advance altogether: the controls still work
 * and every slide is still reachable, the rotation just never happens on its
 * own (PROMPT.md §17, and WCAG 2.2.2 — moving content needs a way to stop).
 *
 * `cycle` is the piece that isn't obvious. The dwell timer is an interval, and
 * resuming one restarts it whole rather than continuing where it left off, so
 * a progress bar animating on its own clock would drift out of step with the
 * thing it claims to be measuring. Re-keying a bar on `cycle` restarts the two
 * together, every time.
 */
export function useSlideshow(count: () => number, dwell = 7000) {
  const index = ref(0)
  /** The viewer pressed pause. Sticky until they press play. */
  const paused = ref(false)
  /** Pointer or focus is inside the carousel. Clears on its own. */
  const held = ref(false)
  /** Bumped whenever the dwell window (re)starts. */
  const cycle = ref(0)

  const visibility = useDocumentVisibility()
  const reducedMotion = usePreferredReducedMotion()

  // Same hydration guard as `useAmbientVideo`, for the same reason: the server
  // can't read a motion preference, so nothing rotates until the client says
  // it may — otherwise the first client frame could differ from the rendered one.
  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })

  const running = computed(
    () =>
      hydrated.value &&
      count() > 1 &&
      !paused.value &&
      !held.value &&
      visibility.value === 'visible' &&
      reducedMotion.value !== 'reduce'
  )

  const { pause: stopTimer, resume: startTimer } = useIntervalFn(
    () => {
      move(1)
      cycle.value++
    },
    dwell,
    { immediate: false }
  )

  function move(by: number) {
    const total = count()
    if (total < 1) return
    // Wraps in both directions — `%` alone gives a negative index going left.
    index.value = (((index.value + by) % total) + total) % total
  }

  /** A deliberate move gets a full dwell window, not whatever was left of one. */
  function restart() {
    if (running.value) {
      stopTimer()
      startTimer()
    }
    cycle.value++
  }

  function goTo(next: number) {
    if (next === index.value) return
    move(next - index.value)
    restart()
  }

  function next() {
    move(1)
    restart()
  }

  function prev() {
    move(-1)
    restart()
  }

  watch(running, (on) => (on ? restart() : stopTimer()), { immediate: true })

  // A shorter list can strand the index past its end (a shelf refetch, a
  // signed-out response). Falling back to the first slide is the only landing
  // spot that always exists.
  watch(count, (total) => {
    if (index.value >= total) index.value = 0
  })

  return {
    index,
    cycle,
    running,
    paused,
    next,
    prev,
    goTo,
    /** Hold the rotation — pointer entered, or focus moved inside. */
    hold: () => (held.value = true),
    release: () => (held.value = false),
    toggle: () => (paused.value = !paused.value)
  }
}
