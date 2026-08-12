// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LikedCard from './LikedCard.vue'
import type { LikedItem } from '#shared/types/library'

/** Two days back, so the relative label is a fixed `"2d ago"` whenever it runs. */
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

function item(overrides: Partial<LikedItem> = {}): LikedItem {
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
    likedAt: TWO_DAYS_AGO,
    avatarUrl: null,
    ...overrides
  }
}

describe('LikedCard', () => {
  it('links to the video it stands for', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo')
  })

  it('escapes ids that would otherwise break the URL', async () => {
    const wrapper = await mountSuspended(LikedCard, {
      props: { item: item({ slug: 'clip a/b' }) }
    })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip%20a%2Fb')
  })

  it('says when the like happened, alongside the view count', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    expect(wrapper.text()).toContain('12.4k views · Liked 2d ago')
  })

  // A saved-but-unwatched video has no progress, and a 0% bar would claim it
  // had been started — the reason the Watch later card has no bar either.
  it('draws no progress bar, because a like says nothing about progress', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    expect(wrapper.html()).not.toContain('bg-foreground/25')
  })

  it('keeps the runtime chip on the thumbnail', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    expect(wrapper.text()).toContain('02:45')
  })

  it('offers a remove action named after the video it removes', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    const trigger = wrapper.find('[aria-haspopup="menu"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-label')).toContain('Midnight Echo')
  })

  // A button nested inside an anchor is invalid markup and swallows the click.
  it('keeps the menu trigger outside the watch link', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    expect(wrapper.find('a button').exists()).toBe(false)
  })

  it('gives the thumbnail explicit dimensions so the grid reserves its space', async () => {
    const wrapper = await mountSuspended(LikedCard, { props: { item: item() } })
    const img = wrapper.find('img')
    expect(img.attributes('width')).toBe('960')
    expect(img.attributes('height')).toBe('540')
    expect(img.attributes('loading')).toBe('lazy')
  })
})
