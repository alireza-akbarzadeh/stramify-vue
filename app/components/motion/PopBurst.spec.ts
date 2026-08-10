// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import PopBurst from './PopBurst.vue'

const slots = { default: () => h('svg') }

describe('PopBurst', () => {
  it('stays still on mount, even when the trigger is already on', async () => {
    const wrapper = await mountSuspended(PopBurst, { props: { trigger: true }, slots })
    expect(wrapper.html()).not.toContain('animate-pop')
    expect(wrapper.findAll('.animate-spark')).toHaveLength(0)
  })

  it('bursts when the trigger turns on', async () => {
    const wrapper = await mountSuspended(PopBurst, { props: { trigger: false }, slots })
    await wrapper.setProps({ trigger: true })

    expect(wrapper.html()).toContain('animate-pop')
    expect(wrapper.findAll('.animate-spark')).toHaveLength(6)
  })

  it('ignores the trigger turning off', async () => {
    const wrapper = await mountSuspended(PopBurst, { props: { trigger: true }, slots })
    await wrapper.setProps({ trigger: false })
    expect(wrapper.html()).not.toContain('animate-pop')
  })

  it('replays for a counter that keeps climbing', async () => {
    const wrapper = await mountSuspended(PopBurst, { props: { trigger: 0 }, slots })
    await wrapper.setProps({ trigger: 1 })
    const first = wrapper.find('.animate-spark').element

    await wrapper.setProps({ trigger: 2 })
    // A fresh element is the whole mechanism — the same node would keep the
    // finished animation and never play it again.
    expect(wrapper.find('.animate-spark').element).not.toBe(first)
  })

  it('swings instead of popping for the bell', async () => {
    const wrapper = await mountSuspended(PopBurst, {
      props: { trigger: false, effect: 'ring' },
      slots
    })
    await wrapper.setProps({ trigger: true })

    expect(wrapper.html()).toContain('animate-bell-ring')
    expect(wrapper.html()).not.toContain('animate-pop')
  })

  it('drops the sparks when asked for none', async () => {
    const wrapper = await mountSuspended(PopBurst, { props: { trigger: false, sparks: 0 }, slots })
    await wrapper.setProps({ trigger: true })

    expect(wrapper.findAll('.animate-spark')).toHaveLength(0)
    expect(wrapper.html()).toContain('animate-pop')
  })
})
