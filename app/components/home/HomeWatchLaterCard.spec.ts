// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HomeWatchLaterCard from './HomeWatchLaterCard.vue'
import type { WatchLaterItem } from '#shared/types/library'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function item(overrides: Partial<WatchLaterItem> = {}): WatchLaterItem {
  return {
    id: 'clip-midnight-echo',
    slug: 'clip-midnight-echo',
    kind: 'clip',
    title: 'Midnight Echo — live from the studio',
    channel: 'Nova_Beats',
    image: 'https://picsum.photos/seed/echo/960/540',
    videoUrl: 'https://example.test/echo.mp4',
    meta: '12.4k views',
    duration: '02:45',
    addedAt: new Date(Date.now() - TWO_DAYS_MS).toISOString(),
    avatarUrl: null,
    ...overrides
  }
}

describe('HomeWatchLaterCard', () => {
  // Nothing has been watched, so there is no position to resume from.
  it('opens the video from the start, with no resume timestamp', async () => {
    const wrapper = await mountSuspended(HomeWatchLaterCard, { props: { item: item() } })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo')
  })

  // The server sends `addedAt` raw because it doesn't know the viewer's clock.
  it('says when the video was saved, in the viewer’s own relative time', async () => {
    const wrapper = await mountSuspended(HomeWatchLaterCard, { props: { item: item() } })
    expect(wrapper.text()).toContain('12.4k views · Saved 2d ago')
  })

  it('shows the runtime rather than a time-remaining chip', async () => {
    const wrapper = await mountSuspended(HomeWatchLaterCard, { props: { item: item() } })
    expect(wrapper.text()).toContain('02:45')
  })

  // A 0% bar on something you haven't started would claim you had.
  it('draws no progress bar', async () => {
    const wrapper = await mountSuspended(HomeWatchLaterCard, { props: { item: item() } })
    expect(wrapper.html()).not.toContain('width:')
  })

  it('offers the unsave action, named for this shelf', async () => {
    const wrapper = await mountSuspended(HomeWatchLaterCard, { props: { item: item() } })
    expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(true)
  })
})
