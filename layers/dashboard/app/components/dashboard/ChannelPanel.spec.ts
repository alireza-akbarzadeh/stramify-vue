// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { CreatorOverview } from '#shared/types/dashboard'
import ChannelPanel from './ChannelPanel.vue'

const creator: CreatorOverview = {
  handle: 'Viper_Squadron',
  exists: true,
  isLive: false,
  liveSlug: null,
  metrics: [
    { key: 'followers', label: 'Followers', value: '1.2k', raw: 1200, hint: 'Rows in follows.' },
    { key: 'clips', label: 'Clips published', value: '3', raw: 3, hint: 'Your clips.' }
  ]
}

describe('ChannelPanel', () => {
  it('renders the handle and every metric', async () => {
    const wrapper = await mountSuspended(ChannelPanel, { props: { creator } })
    expect(wrapper.text()).toContain('Viper_Squadron')
    expect(wrapper.text()).toContain('Followers')
    expect(wrapper.text()).toContain('1.2k')
    expect(wrapper.text()).toContain('Clips published')
  })

  it('shows a live link only while the channel is live', async () => {
    const offline = await mountSuspended(ChannelPanel, { props: { creator } })
    expect(offline.text()).not.toContain('Live now')

    const online = await mountSuspended(ChannelPanel, {
      props: { creator: { ...creator, isLive: true, liveSlug: 'Viper_Squadron' } }
    })
    expect(online.text()).toContain('Live now')
    expect(online.find('a[href="/watch/Viper_Squadron"]').exists()).toBe(true)
  })

  it('shows an empty state instead of zeroed metrics when no channel exists', async () => {
    const wrapper = await mountSuspended(ChannelPanel, {
      props: { creator: { ...creator, exists: false, metrics: [] } }
    })
    expect(wrapper.text()).toContain('Nothing published under')
    expect(wrapper.text()).not.toContain('Followers')
  })
})
