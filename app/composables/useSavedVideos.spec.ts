// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useWatchlistStore } from '@/stores/watchlist'
import { savedListName, useSavedVideos } from './useSavedVideos'
import type { WatchlistItem } from '#shared/types/discovery'

/**
 * The Watch later half is stubbed rather than exercised: it's a TanStack query
 * plus two mutations against a live endpoint, and none of that is what this
 * seam is responsible for. What it *is* responsible for is which of the two
 * lists a bookmark lands in — the thing that was wrong, and that no type can
 * catch, because both halves take the same id.
 *
 * `vi.hoisted` because `vi.mock` is lifted above the imports; a plain `const`
 * would still be in its temporal dead zone when the factory runs.
 */
const later = vi.hoisted(() => ({ isSaved: vi.fn(() => false), toggle: vi.fn() }))

vi.mock('@/composables/useWatchLater', () => ({ useWatchLaterToggle: () => later }))

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'clip-1',
    kind: 'clip',
    title: 'Ranked ladder push',
    creator: 'nova',
    meta: '02:45 · 12.4k views',
    image: '/thumb.jpg',
    ...overrides
  }
}

let saved: ReturnType<typeof useSavedVideos>

const Harness = defineComponent({
  setup() {
    saved = useSavedVideos()
    return () => null
  }
})

const mounted: { unmount: () => void }[] = []

describe('useSavedVideos', () => {
  beforeEach(async () => {
    localStorage.clear()
    useWatchlistStore().clear()
    later.isSaved.mockClear().mockReturnValue(false)
    later.toggle.mockClear()
    mounted.push(await mountSuspended(Harness))
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it("sends a clip's bookmark to Watch later, not to the device", () => {
    saved.toggle(item())

    expect(later.toggle).toHaveBeenCalledWith('clip-1')
    // The bug this whole seam exists for: a clip that lands here instead is a
    // save the account — and therefore `/watch-later` — never hears about.
    expect(useWatchlistStore().items).toHaveLength(0)
  })

  it('keeps a live channel on the device, where the queue has no room for it', () => {
    const signal = item({ id: 'live-9', kind: 'live', title: 'Late night jam' })

    saved.toggle(signal)

    expect(later.toggle).not.toHaveBeenCalled()
    expect(useWatchlistStore().items).toEqual([signal])
  })

  it('reads a clip’s saved flag from the queue', () => {
    later.isSaved.mockReturnValue(true)

    expect(saved.isSaved('clip-1', 'clip')).toBe(true)
    expect(later.isSaved).toHaveBeenCalledWith('clip-1')
  })

  it("reads a live channel's saved flag from the device list", () => {
    saved.toggle(item({ id: 'live-9', kind: 'live' }))

    expect(saved.isSaved('live-9', 'live')).toBe(true)
    expect(saved.isSaved('live-8', 'live')).toBe(false)
    expect(later.isSaved).not.toHaveBeenCalled()
  })

  it('names the list each kind actually goes to', () => {
    expect(savedListName('clip')).toBe('Watch later')
    expect(savedListName('live')).toBe('watchlist')
  })
})
