// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HistoryRow from './HistoryRow.vue'
import type { HistoryItem } from '#shared/types/history'

function item(overrides: Partial<HistoryItem> = {}): HistoryItem {
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
    progressLabel: '4 min left',
    completed: false,
    watchedAt: new Date(2026, 7, 11, 21, 4).toISOString(),
    avatarUrl: null,
    ...overrides
  }
}

describe('HistoryRow', () => {
  it('resumes where the viewer stopped rather than at the start', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo?t=92')
  })

  it('restarts a finished video instead of dropping the viewer at the credits', async () => {
    const wrapper = await mountSuspended(HistoryRow, {
      props: { item: item({ completed: true, positionSeconds: 590 }) }
    })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo')
  })

  it('draws the progress bar to the reported percentage', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.html()).toContain('width: 40%')
  })

  // The whole point of the page: a finished video still gets a bar, and it's
  // full — that's the answer to "have I already seen this one".
  it('draws a full bar on a watched video rather than hiding it', async () => {
    const wrapper = await mountSuspended(HistoryRow, {
      props: { item: item({ completed: true, percent: 100, progressLabel: 'Watched' }) }
    })
    expect(wrapper.html()).toContain('width: 100%')
    expect(wrapper.text()).toContain('Watched')
  })

  it('offers to resume an unfinished video, with how long is left', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.text()).toContain('Resume · 4 min left')
  })

  it('announces the progress to screen readers, which cannot see the bar', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.find('.sr-only').text()).toBe('40% watched, 4 min left')
  })

  it('still shows the runtime, unlike the Continue-watching card', async () => {
    // On a history row the full duration is worth keeping: you may be deciding
    // whether to rewatch something, not just resume it.
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.text()).toContain('02:45')
    expect(wrapper.text()).toContain('12.4k views')
  })

  // The chip used to repeat the progress label, so every row said "5 min left"
  // twice. The chip carries the runtime; the line below carries the progress.
  it('states how far in you are exactly once', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    const visible = wrapper.text().replace(wrapper.find('.sr-only').text(), '')
    expect(visible.match(/4 min left/g)).toHaveLength(1)
  })

  it('keeps the thumbnail from stretching when the title wraps', async () => {
    // A flex child stretches to the row height by default, which pulls the
    // thumbnail off 16:9 on narrow screens.
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.find('img').element.parentElement?.className).toContain('self-start')
  })

  it('offers a remove action named after the video it removes', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    const trigger = wrapper.find('[aria-haspopup="menu"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-label')).toContain('Midnight Echo')
  })

  // A button nested inside an anchor is invalid markup and swallows the click.
  it('keeps the menu trigger outside the watch link', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    expect(wrapper.find('a button').exists()).toBe(false)
  })

  it('gives the thumbnail explicit dimensions so the row reserves its space', async () => {
    const wrapper = await mountSuspended(HistoryRow, { props: { item: item() } })
    const img = wrapper.find('img')
    expect(img.attributes('width')).toBe('480')
    expect(img.attributes('height')).toBe('270')
    expect(img.attributes('loading')).toBe('lazy')
  })
})
