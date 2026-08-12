// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HomeHistoryCard from './HomeHistoryCard.vue'
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
    watchedAt: new Date().toISOString(),
    avatarUrl: null,
    ...overrides
  }
}

describe('HomeHistoryCard', () => {
  it('resumes an unfinished video where the viewer stopped', async () => {
    const wrapper = await mountSuspended(HomeHistoryCard, { props: { item: item() } })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo?t=92')
  })

  // `?t=` on something already watched would drop the viewer at the credits.
  it('restarts a finished video from the top', async () => {
    const wrapper = await mountSuspended(HomeHistoryCard, {
      props: { item: item({ completed: true, percent: 100, progressLabel: 'Watched' }) }
    })
    expect(wrapper.find('a').attributes('href')).toBe('/watch/clip-midnight-echo')
  })

  // A full bar is the answer to "have I already seen this one", so finished
  // videos keep theirs rather than losing it.
  it('keeps a full bar on a finished video', async () => {
    const wrapper = await mountSuspended(HomeHistoryCard, {
      props: { item: item({ completed: true, percent: 100, progressLabel: 'Watched' }) }
    })
    expect(wrapper.html()).toContain('width: 100%')
    expect(wrapper.find('.sr-only').text()).toBe('100% watched, Watched')
  })

  // This shelf answers "what have I been watching", not "what can I finish" —
  // which is what separates it from the Continue-watching rail above it, where
  // the same corner chip carries the time remaining instead.
  it('puts the runtime in the thumbnail chip', async () => {
    const wrapper = await mountSuspended(HomeHistoryCard, { props: { item: item() } })
    expect(wrapper.find('.tabular-nums').text()).toBe('02:45')
  })
})
