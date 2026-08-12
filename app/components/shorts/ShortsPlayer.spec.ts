// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Short } from '#shared/types/shorts'
import { useShortsStore } from '@/stores/shorts'
import ShortsPlayer from './ShortsPlayer.vue'

const short: Short = {
  id: 'short-a',
  title: 'Rig test before the set',
  channel: 'Neon_Drift',
  avatarUrl: null,
  category: 'Music',
  description: 'One tube, one stand.',
  videoUrl: 'https://example.test/a.mp4',
  posterUrl: 'https://example.test/a.jpg',
  views: '48.2k views',
  publishedAt: '35m ago',
  likes: 12400,
  dislikes: 12,
  myReaction: null,
  commentCount: 340,
  isFollowing: false
}

/**
 * Vidstack isn't registered in this environment, so `<media-player>` renders as
 * an inert `HTMLElement`. Standing the element's own surface up by hand is what
 * lets these assert on the reconciliation in `sync()` — which is where the bug
 * lived — rather than on the media stack underneath it.
 */
function stub(el: HTMLElement, canPlay: boolean, play: () => Promise<void>) {
  return Object.assign(el, {
    state: { canPlay },
    muted: true,
    play: vi.fn(play),
    pause: vi.fn(async () => {})
  })
}

const mounted: { unmount: () => void }[] = []

/**
 * Mount, then settle the store to `muted`.
 *
 * Through `toggleMuted` rather than by assignment, because the store's `muted`
 * is derived — the viewer's saved preference or the browser's autoplay block —
 * and going through the action is what these assert against anyway.
 *
 * The store persists the preference to local storage and reads it back on
 * mount, so without the clear one test's state is the next one's starting
 * point. The `nextTick` is for the same reason from the other side — the read
 * lands in the component's own mounted hook, after `mountSuspended` has handed
 * back.
 */
async function mount(muted: boolean) {
  const wrapper = await mountSuspended(ShortsPlayer, {
    props: { short, active: true, loop: false }
  })
  mounted.push(wrapper)
  const shorts = useShortsStore()
  await nextTick()
  if (shorts.muted !== muted) shorts.toggleMuted()
  await nextTick()
  return { wrapper, shorts }
}

/** `sync()` re-runs on `can-play`; dispatching it is how these drive one pass. */
async function syncOnce(el: HTMLElement) {
  el.dispatchEvent(new Event('can-play'))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('ShortsPlayer', () => {
  beforeEach(() => localStorage.clear())

  // The store outlives any one player, so a leftover instance keeps answering
  // the mute watcher and re-runs its own `sync()` against the next test's state.
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('leaves the sound preference alone when playback fails for anything but an autoplay block', async () => {
    const { wrapper, shorts } = await mount(false)

    const el = stub(wrapper.element as HTMLElement, true, () =>
      Promise.reject(new DOMException('media is not ready', 'AbortError'))
    )
    await syncOnce(el)

    // The regression: every rejection used to be read as an autoplay refusal,
    // so a not-yet-ready element silently re-muted the feed — and persisted it.
    expect(shorts.muted).toBe(false)
  })

  it('falls back to muted only when the browser blocks unmuted autoplay', async () => {
    const { wrapper, shorts } = await mount(false)

    const el = stub(wrapper.element as HTMLElement, true, () =>
      Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    )
    await syncOnce(el)

    expect(shorts.muted).toBe(true)
  })

  it('keeps an autoplay block out of the saved preference, so a gesture restores sound', async () => {
    const { wrapper, shorts } = await mount(false)

    const el = stub(wrapper.element as HTMLElement, true, () =>
      Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    )
    await syncOnce(el)
    expect(shorts.muted).toBe(true)

    // The browser's refusal, not the viewer's choice: nothing was written to
    // storage, and the gesture `useAutoplayGate` waits for gives sound back.
    // The old fallback persisted `true` here, which is what made a feed that
    // was only *temporarily* blocked stay muted for every visit after it.
    expect(localStorage.getItem('streamify.shorts.muted.v2')).not.toBe('true')
    shorts.unblockAudio()
    expect(shorts.muted).toBe(false)
  })

  it('waits for the provider before asking it to play', async () => {
    const { wrapper } = await mount(false)

    const el = stub(wrapper.element as HTMLElement, false, async () => {})
    await syncOnce(el)

    expect(el.play).not.toHaveBeenCalled()
    expect(el.pause).not.toHaveBeenCalled()
    // Mute still lands: Vidstack queues it until the provider exists, which is
    // what keeps the very first frame silent.
    expect(el.muted).toBe(false)
  })

  it('pushes the store’s mute onto the element as both attribute and property', async () => {
    const { wrapper } = await mount(true)

    const el = stub(wrapper.element as HTMLElement, true, async () => {})
    await syncOnce(el)

    expect(el.muted).toBe(true)
    expect(el.hasAttribute('muted')).toBe(true)
  })
})
