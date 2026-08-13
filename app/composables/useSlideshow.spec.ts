// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useSlideshow } from './useSlideshow'

/**
 * The rotation only starts after `onMounted` (the hydration guard), so every
 * case here goes through a real mount rather than calling the composable bare.
 * `count` is a ref behind a getter, which is how `MusicHero` passes it — the
 * slide list is a computed over props there.
 */
const count = ref(3)
const DWELL = 7000

function harness() {
  let api: ReturnType<typeof useSlideshow>
  const Component = defineComponent({
    setup() {
      api = useSlideshow(() => count.value, DWELL)
      return () => h('div', String(api.index.value))
    }
  })
  return mountSuspended(Component).then((wrapper) => ({ wrapper, api: api! }))
}

describe('useSlideshow', () => {
  beforeEach(() => {
    count.value = 3
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances on its own once the dwell elapses', async () => {
    const { api } = await harness()

    expect(api.index.value).toBe(0)
    vi.advanceTimersByTime(DWELL)
    expect(api.index.value).toBe(1)
    vi.advanceTimersByTime(DWELL)
    expect(api.index.value).toBe(2)
  })

  it('wraps in both directions', async () => {
    const { api } = await harness()

    api.prev()
    expect(api.index.value).toBe(2)
    api.next()
    expect(api.index.value).toBe(0)
  })

  it('holds while the pointer or focus is inside, and picks back up on release', async () => {
    const { api } = await harness()

    api.hold()
    // Two dwells, not three: with three slides, three ticks would wrap back to
    // the first one and a broken hold would pass as a working one.
    vi.advanceTimersByTime(DWELL * 2)
    expect(api.index.value).toBe(0)

    api.release()
    vi.advanceTimersByTime(DWELL)
    expect(api.index.value).toBe(1)
  })

  it('stays put while paused, and the controls still work', async () => {
    const { api } = await harness()

    api.toggle()
    expect(api.paused.value).toBe(true)
    vi.advanceTimersByTime(DWELL * 2)
    expect(api.index.value).toBe(0)

    // Paused stops the *rotation*, not the carousel — every slide has to stay
    // reachable, or pausing would be a trap rather than a control.
    api.next()
    expect(api.index.value).toBe(1)
  })

  it('gives a deliberate move a full dwell rather than the tail of one', async () => {
    const { api } = await harness()

    vi.advanceTimersByTime(DWELL - 500)
    api.goTo(2)
    expect(api.index.value).toBe(2)

    vi.advanceTimersByTime(600)
    expect(api.index.value).toBe(2)
    vi.advanceTimersByTime(DWELL - 600)
    expect(api.index.value).toBe(0)
  })

  it('re-keys the dwell window on every restart, so a progress bar can follow', async () => {
    const { api } = await harness()
    const start = api.cycle.value

    vi.advanceTimersByTime(DWELL)
    expect(api.cycle.value).toBeGreaterThan(start)

    const afterTick = api.cycle.value
    api.next()
    expect(api.cycle.value).toBeGreaterThan(afterTick)
  })

  it('falls back to the first slide when the list shrinks underneath it', async () => {
    const { api } = await harness()

    api.goTo(2)
    count.value = 2
    await nextTick()

    expect(api.index.value).toBe(0)
  })

  it('never rotates a single slide', async () => {
    count.value = 1
    const { api } = await harness()

    vi.advanceTimersByTime(DWELL * 3)
    expect(api.index.value).toBe(0)
  })
})
