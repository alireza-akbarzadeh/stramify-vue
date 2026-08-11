// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { Short } from '#shared/types/shorts'
import { useShortsStore } from '@/stores/shorts'
import ShortsActionRail from './ShortsActionRail.vue'

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
  myReaction: 'like',
  commentCount: 340,
  isFollowing: false
}

const mount = (props: Partial<Short> = {}) =>
  mountSuspended(ShortsActionRail, { props: { short: { ...short, ...props } } })

describe('ShortsActionRail', () => {
  it('shows formatted counts rather than raw numbers', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('12.4k')
    expect(wrapper.text()).toContain('340')
  })

  it('announces the viewer’s own reaction through aria-pressed', async () => {
    const wrapper = await mount()
    const like = wrapper.get('button[aria-label^="Like"]')
    const dislike = wrapper.get('button[aria-label^="Dislike"]')
    expect(like.attributes('aria-pressed')).toBe('true')
    expect(dislike.attributes('aria-pressed')).toBe('false')
  })

  it('gives every action a name, since none of them carry visible label text', async () => {
    const wrapper = await mount()
    const labels = wrapper.findAll('button').map((button) => button.attributes('aria-label'))
    expect(labels).toHaveLength(6)
    expect(labels.every((label) => !!label?.trim())).toBe(true)
  })

  it('labels the save button by what pressing it will do', async () => {
    const wrapper = await mount()
    expect(wrapper.find('button[aria-label="Save to watchlist"]').exists()).toBe(true)
  })

  it('drives repeat off the store, not the comment sheet it was copied from', async () => {
    const wrapper = await mount()
    const shorts = useShortsStore()
    const repeat = wrapper.get('button[aria-label="Repeat this short (r)"]')

    expect(repeat.attributes('aria-pressed')).toBe('false')

    await repeat.trigger('click')

    expect(shorts.repeat).toBe(true)
    // The sheet stays shut: the two used to share a handler.
    expect(shorts.commentsFor).toBeNull()
    expect(repeat.attributes('aria-label')).toBe('Turn off repeat (r)')
    expect(repeat.attributes('aria-pressed')).toBe('true')
  })
})
