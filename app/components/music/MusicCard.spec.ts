// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import MusicCard from './MusicCard.vue'
import type { MusicTrack } from '#shared/types/music'

function track(overrides: Partial<MusicTrack> = {}): MusicTrack {
  return {
    id: 'clip-midnight-echo',
    title: 'The Midnight Echo: Unrehearsed Encore at Tokyo Dome',
    creator: 'EchoCollective',
    category: 'Music',
    age: '3h ago',
    views: '12.4k views',
    duration: '02:45',
    image: 'https://picsum.photos/seed/echo/960/540',
    videoUrl: 'https://example.test/echo.mp4',
    ...overrides
  }
}

describe('MusicCard', () => {
  it('renders the track, its creator and its meta line', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })

    expect(wrapper.text()).toContain('The Midnight Echo: Unrehearsed Encore at Tokyo Dome')
    expect(wrapper.text()).toContain('EchoCollective')
    expect(wrapper.text()).toContain('12.4k views')
    expect(wrapper.text()).toContain('3h ago')
  })

  it('links the whole card to the watch route for its id', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })

    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo')
  })

  it('encodes an id that needs it', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track({ id: 'a b/c' }) } })

    expect(wrapper.find('a').attributes('href')).toBe('/watch/a%20b%2Fc')
  })

  // The play circle is decoration over the link's hit area — a real <button>
  // there would be invalid HTML inside an <a> and would swallow the click.
  it('puts no interactive control inside the watch link', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })

    expect(wrapper.find('a button').exists()).toBe(false)
  })

  it('shows the duration until a preview takes over', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })

    expect(wrapper.text()).toContain('02:45')
    expect(wrapper.text()).not.toContain('Preview')
  })

  // The whole card has to be readable before any hover happens — the preview is
  // an enhancement, and on touch and reduced-motion it never fires at all.
  it('mounts no video element until the pointer asks for one', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })

    expect(wrapper.find('video').exists()).toBe(false)
    expect(wrapper.find('img').attributes('src')).toBe('https://picsum.photos/seed/echo/960/540')
  })

  it('gives the artwork a description rather than leaving it unlabelled', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })

    expect(wrapper.find('img').attributes('alt')).toBe(
      'The Midnight Echo: Unrehearsed Encore at Tokyo Dome'
    )
  })

  // Reserving the box keeps a rail from reflowing as artwork lands (CLS).
  it('declares intrinsic dimensions on the artwork', async () => {
    const wrapper = await mountSuspended(MusicCard, { props: { track: track() } })
    const img = wrapper.find('img')

    expect(img.attributes('width')).toBe('960')
    expect(img.attributes('height')).toBe('540')
    expect(img.attributes('loading')).toBe('lazy')
  })
})
