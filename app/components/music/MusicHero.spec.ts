// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import MusicHero from './MusicHero.vue'
import type { MusicTrack } from '#shared/types/music'

function track(id: string, overrides: Partial<MusicTrack> = {}): MusicTrack {
  return {
    id,
    title: `Track ${id}`,
    creator: 'EchoCollective',
    category: 'Music',
    age: '3h ago',
    views: '12.4k views',
    duration: '02:45',
    image: `https://picsum.photos/seed/${id}/960/540`,
    videoUrl: `https://example.test/${id}.mp4`,
    ...overrides
  }
}

const hero = track('hero', { title: 'Neon District' })
const queue = [track('a', { title: 'Analog Drift' }), track('b', { title: 'The Basement Tape' })]

const mount = () => mountSuspended(MusicHero, { props: { track: hero, queue } })

describe('MusicHero', () => {
  it('opens on the featured track, with its own metadata', async () => {
    const wrapper = await mount()

    expect(wrapper.get('#music-hero-title').text()).toBe('Neon District')
    expect(wrapper.text()).toContain('EchoCollective')
    expect(wrapper.text()).toContain('12.4k views')
  })

  it('points "Play now" at whatever slide is showing, not at the first one', async () => {
    const wrapper = await mount()
    expect(wrapper.get('a').attributes('href')).toBe('/watch/hero')

    await wrapper.get('[aria-label="Next track"]').trigger('click')

    expect(wrapper.get('#music-hero-title').text()).toBe('Analog Drift')
    expect(wrapper.get('a').attributes('href')).toBe('/watch/a')
  })

  it('wraps backwards from the first slide to the last', async () => {
    const wrapper = await mount()

    await wrapper.get('[aria-label="Previous track"]').trigger('click')

    expect(wrapper.get('#music-hero-title').text()).toBe('The Basement Tape')
  })

  it('lists every slide in the queue strip, hero included, and marks the current one', async () => {
    const wrapper = await mount()

    // Two presentations of the same strip (segments below `sm`, thumbnails
    // above it), so each slide contributes two buttons.
    const current = wrapper.findAll('[aria-current="true"]')
    expect(current).toHaveLength(2)
    current.forEach((el) => expect(el.attributes('aria-label')).toBe('Show Neon District'))

    await wrapper.get('[aria-label="Show The Basement Tape"]').trigger('click')

    expect(wrapper.get('#music-hero-title').text()).toBe('The Basement Tape')
  })

  it('exposes a pause control that names the action it will take', async () => {
    const wrapper = await mount()
    const button = () => wrapper.get('[aria-pressed]')

    expect(button().attributes('aria-label')).toBe('Pause the carousel')

    await button().trigger('click')

    expect(button().attributes('aria-label')).toBe('Resume the carousel')
    expect(button().attributes('aria-pressed')).toBe('true')
  })

  it('drops the strip and its controls when there is nothing to rotate through', async () => {
    const wrapper = await mountSuspended(MusicHero, { props: { track: hero, queue: [] } })

    expect(wrapper.find('[aria-label="Next track"]').exists()).toBe(false)
    expect(wrapper.get('#music-hero-title').text()).toBe('Neon District')
  })
})
