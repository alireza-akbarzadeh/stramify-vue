import { describe, expect, it } from 'vitest'
import type { HomeFeedPage, HomeVideo } from '#shared/types/home'
import type { HomeFeedCache } from './home'
import { dropFromFollowing, dropFromHomeFeed, feedbackMessage, isSuppressed } from './home'

function video(overrides: Partial<HomeVideo> = {}): HomeVideo {
  return {
    id: 'clip-midnight-echo',
    slug: 'clip-midnight-echo',
    kind: 'clip',
    title: 'Midnight Echo',
    channel: 'Nova_Beats',
    category: 'Music',
    image: 'https://picsum.photos/seed/echo/960/540',
    videoUrl: 'https://example.test/echo.mp4',
    meta: '12.4k views · 3h ago',
    avatarUrl: null,
    reason: null,
    ...overrides
  }
}

function cache(...pages: HomeVideo[][]): HomeFeedCache {
  return {
    pages: pages.map<HomeFeedPage>((items, index) => ({
      items,
      nextCursor: index === pages.length - 1 ? null : (index + 1) * 24
    })),
    pageParams: pages.map((_page, index) => index * 24)
  }
}

describe('isSuppressed', () => {
  it('hides only the video it names', () => {
    const other = video({ id: 'clip-other' })
    expect(isSuppressed({ kind: 'video', target: 'clip-midnight-echo' }, video())).toBe(true)
    expect(isSuppressed({ kind: 'video', target: 'clip-midnight-echo' }, other)).toBe(false)
  })

  it('hides every video by the named channel', () => {
    const feedback = { kind: 'channel', target: 'nova_beats' } as const
    expect(isSuppressed(feedback, video({ id: 'clip-other' }))).toBe(true)
    expect(isSuppressed(feedback, video({ channel: 'Canvas_Queen' }))).toBe(false)
  })

  it('compares channels as handles, not as the casing the card rendered', () => {
    expect(isSuppressed({ kind: 'channel', target: 'NOVA_beats' }, video())).toBe(true)
  })
})

describe('dropFromHomeFeed', () => {
  it('removes the video from whichever loaded page holds it', () => {
    const first = cache([video({ id: 'a' }), video({ id: 'b' })], [video({ id: 'c' })])
    const next = dropFromHomeFeed(first, { kind: 'video', target: 'b' })
    expect(next?.pages.flatMap((page) => page.items.map((item) => item.id))).toEqual(['a', 'c'])
  })

  it("takes the channel's other videos with it, including on later pages", () => {
    const first = cache(
      [video({ id: 'a' }), video({ id: 'b', channel: 'Canvas_Queen' })],
      [video({ id: 'c' })]
    )
    const next = dropFromHomeFeed(first, { kind: 'channel', target: 'nova_beats' })
    expect(next?.pages.flatMap((page) => page.items.map((item) => item.id))).toEqual(['b'])
  })

  it('keeps the paging metadata so "Load more" still knows where it is', () => {
    const first = cache([video({ id: 'a' })], [video({ id: 'b' })])
    const next = dropFromHomeFeed(first, { kind: 'video', target: 'a' })
    expect(next?.pageParams).toEqual(first.pageParams)
    expect(next?.pages.map((page) => page.nextCursor)).toEqual([24, null])
  })

  it('leaves an unfetched cache alone', () => {
    expect(dropFromHomeFeed(undefined, { kind: 'video', target: 'a' })).toBeUndefined()
  })
})

describe('dropFromFollowing', () => {
  it('filters the rail with the same rule', () => {
    const rail = [video({ id: 'a' }), video({ id: 'b', channel: 'Canvas_Queen' })]
    expect(dropFromFollowing(rail, { kind: 'channel', target: 'canvas_queen' })).toEqual([rail[0]])
  })

  it('leaves an unfetched rail alone', () => {
    expect(dropFromFollowing(undefined, { kind: 'video', target: 'a' })).toBeUndefined()
  })
})

describe('feedbackMessage', () => {
  it('names the channel it just hid', () => {
    expect(feedbackMessage({ kind: 'channel', target: 'nova_beats' })).toBe(
      "You won't see @nova_beats on your home page."
    )
  })

  it('promises less of the same for one video', () => {
    expect(feedbackMessage({ kind: 'video', target: 'clip-a' })).toContain('fewer videos like this')
  })
})
