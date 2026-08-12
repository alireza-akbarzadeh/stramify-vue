// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HomeRailCard from './HomeRailCard.vue'

function props(overrides: Record<string, unknown> = {}) {
  return {
    to: '/watch/clip-midnight-echo',
    title: 'Midnight Echo — live from the studio',
    channel: 'Nova_Beats',
    image: 'https://picsum.photos/seed/echo/960/540',
    avatarUrl: null,
    meta: '12.4k views',
    chip: '02:45',
    menuLabel: 'Remove from Watch later',
    ...overrides
  }
}

describe('HomeRailCard', () => {
  it('draws the progress bar to the reported percentage', async () => {
    const wrapper = await mountSuspended(HomeRailCard, {
      props: props({ percent: 40, progressLabel: '4 min left' })
    })
    expect(wrapper.html()).toContain('width: 40%')
  })

  it('announces the progress to screen readers, which cannot see the bar', async () => {
    const wrapper = await mountSuspended(HomeRailCard, {
      props: props({ percent: 40, progressLabel: '4 min left' })
    })
    expect(wrapper.find('.sr-only').text()).toBe('40% watched, 4 min left')
  })

  // A saved-but-unwatched video has no progress, and a 0%-wide bar would claim
  // it had been started.
  it('omits the bar entirely when there is no progress to show', async () => {
    const wrapper = await mountSuspended(HomeRailCard, { props: props() })
    expect(wrapper.html()).not.toContain('width:')
    expect(wrapper.find('.sr-only').exists()).toBe(false)
  })

  it('shows a zero-percent bar rather than none when progress is genuinely zero', async () => {
    const wrapper = await mountSuspended(HomeRailCard, { props: props({ percent: 0 }) })
    expect(wrapper.html()).toContain('width: 0%')
  })

  it('names the menu action after whichever shelf owns the card', async () => {
    const wrapper = await mountSuspended(HomeRailCard, {
      props: props({ menuLabel: 'Remove from watch history' })
    })
    const trigger = wrapper.find('[aria-haspopup="menu"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-label')).toContain('Midnight Echo')
  })

  // A button nested inside an anchor is invalid markup and swallows the click.
  it('keeps the menu trigger outside the watch link', async () => {
    const wrapper = await mountSuspended(HomeRailCard, { props: props() })
    expect(wrapper.find('a button').exists()).toBe(false)
  })
})
