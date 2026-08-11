// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import FollowingStoryCircle from './FollowingStoryCircle.vue'
import type { FollowedChannel } from '#shared/types/following'

function channel(overrides: Partial<FollowedChannel> = {}): FollowedChannel {
  return {
    handle: 'canvas_queen',
    name: 'Canvas Queen',
    tagline: 'Illustration and long finishing passes.',
    avatarUrl: null,
    bannerUrl: null,
    verified: true,
    followerCount: 1240,
    clipCount: 4,
    isLive: false,
    liveTitle: null,
    liveSlug: null,
    notify: 'all',
    followedAt: '2026-08-01T00:00:00.000Z',
    hasNew: false,
    categories: ['Creative'],
    ...overrides
  }
}

const mount = (value: FollowedChannel) =>
  mountSuspended(FollowingStoryCircle, { props: { channel: value } })

describe('FollowingStoryCircle', () => {
  it('names the channel and links to its page when offline', async () => {
    const wrapper = await mount(channel())
    expect(wrapper.text()).toContain('Canvas Queen')
    expect(wrapper.find('a').attributes('href')).toBe('/channel/canvas_queen')
  })

  it('links straight into the broadcast while the channel is live', async () => {
    const wrapper = await mount(channel({ isLive: true, liveSlug: 'Canvas_Queen' }))
    expect(wrapper.find('a').attributes('href')).toBe('/watch/Canvas_Queen')
  })

  /**
   * The ring is the whole point of the component and it's decorative to a
   * screen reader, so the state has to survive in the accessible name too.
   */
  it('carries the ring state in the accessible name, not just the colour', async () => {
    const quiet = await mount(channel())
    expect(quiet.find('a').attributes('aria-label')).toBe('Canvas Queen')

    const fresh = await mount(channel({ hasNew: true }))
    expect(fresh.find('a').attributes('aria-label')).toBe('Canvas Queen, new this week')

    const live = await mount(channel({ isLive: true, liveTitle: 'Cover commission' }))
    expect(live.find('a').attributes('aria-label')).toBe(
      'Canvas Queen is live now: Cover commission'
    )
  })

  it('spells "Live" out, so the state does not depend on telling hues apart', async () => {
    const wrapper = await mount(channel({ isLive: true, liveSlug: 'Canvas_Queen' }))
    expect(wrapper.text()).toContain('Live')
  })

  it('animates the ring only while live, and never for reduced motion', async () => {
    const live = await mount(channel({ isLive: true, liveSlug: 'Canvas_Queen' }))
    const ring = live.find('.animate-story-ring')
    expect(ring.exists()).toBe(true)
    expect(ring.classes()).toContain('motion-reduce:animate-none')

    const fresh = await mount(channel({ hasNew: true }))
    expect(fresh.find('.animate-story-ring').exists()).toBe(false)
  })

  /**
   * A gradient on every circle would make a lit ring meaningless, so the quiet
   * state has to be a flat border and nothing else.
   *
   * Asserted on the class rather than on the rendered `background-image`: the
   * gradient is set through a style binding, and a DOM shim that can't parse
   * `oklch()` inside `conic-gradient()` would drop it silently and fail this
   * for a reason that has nothing to do with the component. The gradient values
   * themselves are covered in `app/utils/channel.spec.ts`.
   */
  it('paints a flat ring only when there is nothing to say', async () => {
    const quiet = await mount(channel())
    expect(quiet.find('.bg-border').exists()).toBe(true)

    const fresh = await mount(channel({ hasNew: true }))
    expect(fresh.find('.bg-border').exists()).toBe(false)

    const live = await mount(channel({ isLive: true, liveSlug: 'Canvas_Queen' }))
    expect(live.find('.bg-border').exists()).toBe(false)
  })
})
