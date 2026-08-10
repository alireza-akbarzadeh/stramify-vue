// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LiveBadge from '@/components/landing/LiveBadge.vue'
import HomeVideoCard from './HomeVideoCard.vue'
import type { HomeVideo } from '#shared/types/home'

function video(overrides: Partial<HomeVideo> = {}): HomeVideo {
  return {
    id: 'clip-midnight-echo',
    slug: 'clip-midnight-echo',
    kind: 'clip',
    title: 'Midnight Echo — live from the studio',
    channel: 'Nova_Beats',
    category: 'Music',
    image: 'https://picsum.photos/seed/echo/960/540',
    videoUrl: 'https://example.test/echo.mp4',
    meta: '12.4k views · 3h ago',
    duration: '02:45',
    avatarUrl: null,
    reason: null,
    ...overrides
  }
}

describe('HomeVideoCard', () => {
  it('renders the title, channel and meta line', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, { props: { video: video(), saved: false } })
    expect(wrapper.text()).toContain('Midnight Echo — live from the studio')
    expect(wrapper.text()).toContain('Nova_Beats')
    expect(wrapper.text()).toContain('12.4k views · 3h ago')
  })

  it('links to the watch route for its slug', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, { props: { video: video(), saved: false } })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo')
  })

  it('encodes a slug that needs it', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, {
      props: { video: video({ slug: 'Viper Squadron' }), saved: false }
    })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/Viper%20Squadron')
  })

  it('shows the duration chip and no live badge on a clip', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, { props: { video: video(), saved: false } })
    expect(wrapper.text()).toContain('02:45')
    expect(wrapper.findComponent(LiveBadge).exists()).toBe(false)
  })

  it('shows a live badge instead of a duration on a live session', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, {
      props: {
        video: video({ kind: 'live', duration: undefined, meta: '8.4k watching · live 3h 17m' }),
        saved: false
      }
    })
    expect(wrapper.findComponent(LiveBadge).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('02:45')
  })

  it('explains a follow-driven recommendation', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, {
      props: { video: video({ reason: 'following' }), saved: false }
    })
    expect(wrapper.text()).toContain('Because you follow Nova_Beats')
  })

  it('says nothing when popularity alone put it in the feed', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, { props: { video: video(), saved: false } })
    expect(wrapper.text()).not.toContain('Because you follow')
    expect(wrapper.text()).not.toContain('New upload')
  })

  it('emits toggle-save from the save button', async () => {
    const wrapper = await mountSuspended(HomeVideoCard, { props: { video: video(), saved: false } })
    await wrapper.find('button[aria-pressed]').trigger('click')
    expect(wrapper.emitted('toggle-save')).toHaveLength(1)
  })
})
