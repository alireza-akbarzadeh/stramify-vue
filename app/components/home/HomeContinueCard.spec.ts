// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HomeContinueCard from './HomeContinueCard.vue'
import type { ContinueWatchingItem } from '#shared/types/library'

function item(overrides: Partial<ContinueWatchingItem> = {}): ContinueWatchingItem {
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
    positionSeconds: 92,
    percent: 40,
    remaining: '4 min left',
    avatarUrl: null,
    ...overrides
  }
}

describe('HomeContinueCard', () => {
  it('resumes where the viewer stopped rather than at the start', async () => {
    const wrapper = await mountSuspended(HomeContinueCard, { props: { item: item() } })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo?t=92')
  })

  it('draws the progress bar to the reported percentage', async () => {
    const wrapper = await mountSuspended(HomeContinueCard, { props: { item: item() } })
    expect(wrapper.html()).toContain('width: 40%')
  })

  // Time remaining is the number you want on something you're partway through;
  // the runtime is only useful before you start.
  it('shows the time left instead of the duration chip', async () => {
    const wrapper = await mountSuspended(HomeContinueCard, { props: { item: item() } })
    expect(wrapper.text()).toContain('4 min left')
    expect(wrapper.text()).not.toContain('02:45')
  })

  it('announces the progress to screen readers, which cannot see the bar', async () => {
    const wrapper = await mountSuspended(HomeContinueCard, { props: { item: item() } })
    expect(wrapper.find('.sr-only').text()).toBe('40% watched, 4 min left')
  })

  it('offers a remove action named after the video it removes', async () => {
    const wrapper = await mountSuspended(HomeContinueCard, { props: { item: item() } })
    const trigger = wrapper.find('[aria-haspopup="menu"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-label')).toContain('Midnight Echo')
  })

  // A button nested inside an anchor is invalid markup and swallows the click.
  it('keeps the menu trigger outside the watch link', async () => {
    const wrapper = await mountSuspended(HomeContinueCard, { props: { item: item() } })
    expect(wrapper.find('a button').exists()).toBe(false)
  })
})
