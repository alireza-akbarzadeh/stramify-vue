// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { ChannelSummary } from '#shared/types/watch'
import WatchChannelBar from './WatchChannelBar.vue'

const channel: ChannelSummary = {
  name: 'EchoCollective',
  followers: '128.4k',
  isFollowing: false,
  clipCount: 42,
  notify: 'none'
}

const props = { channel, name: 'EchoCollective' }

/** The bell's trigger is icon-only, so its accessible name is how it's found. */
const BELL = '[aria-label^="Notifications for"]'

describe('WatchChannelBar', () => {
  it('links the identity to the channel page', async () => {
    const wrapper = await mountSuspended(WatchChannelBar, { props })
    expect(wrapper.find('a').attributes('href')).toBe('/channel/echocollective')
    expect(wrapper.text()).toContain('128.4k followers')
  })

  it('offers Follow and no bell to someone who does not follow yet', async () => {
    const wrapper = await mountSuspended(WatchChannelBar, { props })
    expect(wrapper.find('button').text()).toContain('Follow')
    expect(wrapper.find(BELL).exists()).toBe(false)
  })

  it('emits the follow toggle', async () => {
    const wrapper = await mountSuspended(WatchChannelBar, { props })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('toggle-follow')).toHaveLength(1)
  })

  it('reveals the bell once you follow, labelled with the current setting', async () => {
    const wrapper = await mountSuspended(WatchChannelBar, {
      props: { ...props, channel: { ...channel, isFollowing: true, notify: 'live' } }
    })

    expect(wrapper.find('button').text()).toContain('Following')
    expect(wrapper.find(BELL).attributes('aria-label')).toBe(
      'Notifications for EchoCollective: live only'
    )
  })

  it('waits for the channel before enabling the follow button', async () => {
    const wrapper = await mountSuspended(WatchChannelBar, {
      props: { channel: null, name: 'EchoCollective' }
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
