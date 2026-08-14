// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StudioVisibilityBadge from './StudioVisibilityBadge.vue'
import { CLIP_VISIBILITIES } from '#shared/types/studio'

describe('StudioVisibilityBadge', () => {
  it.each(CLIP_VISIBILITIES)('spells out "%s" rather than relying on colour', async (visibility) => {
    // The whole point of this component: "private" and "public" are the two
    // states a creator most needs to read correctly, and a red-vs-green dot is
    // exactly the encoding that fails a colourblind reader.
    const wrapper = await mountSuspended(StudioVisibilityBadge, { props: { visibility } })
    const label = visibility.charAt(0).toUpperCase() + visibility.slice(1)
    expect(wrapper.text()).toContain(label)
  })

  it('pairs the word with an icon', async () => {
    const wrapper = await mountSuspended(StudioVisibilityBadge, {
      props: { visibility: 'public' }
    })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('marks the icon decorative so the word is not read twice', async () => {
    const wrapper = await mountSuspended(StudioVisibilityBadge, {
      props: { visibility: 'unlisted' }
    })
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })
})
