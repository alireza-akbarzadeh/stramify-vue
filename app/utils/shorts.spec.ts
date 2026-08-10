import { describe, expect, it } from 'vitest'
import type { Short } from '#shared/types/shorts'
import type { ShortsFeedCache } from './shorts'
import { applyShortReaction, patchShorts, shortToItem } from './shorts'

const short = (over: Partial<Short> = {}): Short => ({
  id: 'short-a',
  title: 'Rig test before the set',
  channel: 'Neon_Drift',
  avatarUrl: null,
  category: 'Music',
  description: 'One tube, one stand.',
  videoUrl: 'https://example.test/a.mp4',
  posterUrl: 'https://example.test/a.jpg',
  views: '48.2k views',
  publishedAt: '35m ago',
  likes: 10,
  dislikes: 2,
  myReaction: null,
  commentCount: 4,
  isFollowing: false,
  ...over
})

const cache = (...items: Short[][]): ShortsFeedCache => ({
  pageParams: items.map((_, index) => index * items.length),
  pages: items.map((page, index) => ({
    items: page,
    nextCursor: index === items.length - 1 ? null : index + 1
  }))
})

describe('applyShortReaction', () => {
  it('adds a like when nothing was picked', () => {
    expect(applyShortReaction(short(), 'like')).toMatchObject({
      likes: 11,
      dislikes: 2,
      myReaction: 'like'
    })
  })

  it('clears the like when the same button is pressed again', () => {
    expect(applyShortReaction(short({ myReaction: 'like' }), 'like')).toMatchObject({
      likes: 9,
      myReaction: null
    })
  })

  it('moves the count across when switching like to dislike', () => {
    expect(applyShortReaction(short({ myReaction: 'like' }), 'dislike')).toMatchObject({
      likes: 9,
      dislikes: 3,
      myReaction: 'dislike'
    })
  })

  it('leaves the short it was given untouched', () => {
    const original = short()
    applyShortReaction(original, 'like')
    expect(original.likes).toBe(10)
    expect(original.myReaction).toBeNull()
  })
})

describe('patchShorts', () => {
  it('updates a matching short on any page, not just the first', () => {
    const patched = patchShorts(
      cache([short({ id: 'a' })], [short({ id: 'b' })]),
      (item) => item.id === 'b',
      (item) => ({ ...item, likes: 99 })
    )
    expect(patched?.pages[0]?.items[0]?.likes).toBe(10)
    expect(patched?.pages[1]?.items[0]?.likes).toBe(99)
  })

  it('updates every short the predicate matches — a follow hits a whole channel', () => {
    const patched = patchShorts(
      cache([short({ id: 'a' }), short({ id: 'b' })], [short({ id: 'c', channel: 'Sky_High' })]),
      (item) => item.channel === 'Neon_Drift',
      (item) => ({ ...item, isFollowing: true })
    )
    expect(patched?.pages[0]?.items.map((item) => item.isFollowing)).toEqual([true, true])
    expect(patched?.pages[1]?.items[0]?.isFollowing).toBe(false)
  })

  it('returns undefined for an empty cache instead of inventing pages', () => {
    expect(patchShorts(undefined, () => true, (item) => item)).toBeUndefined()
  })

  it('preserves paging metadata so the next fetch still knows where it is', () => {
    const original = cache([short()], [short({ id: 'b' })])
    const patched = patchShorts(original, () => true, (item) => ({ ...item, likes: 1 }))
    expect(patched?.pages.map((page) => page.nextCursor)).toEqual(
      original.pages.map((page) => page.nextCursor)
    )
    expect(patched?.pageParams).toEqual(original.pageParams)
  })
})

describe('shortToItem', () => {
  it('maps a short onto a clip watchlist entry', () => {
    expect(shortToItem(short())).toEqual({
      id: 'short-a',
      kind: 'clip',
      title: 'Rig test before the set',
      creator: 'Neon_Drift',
      meta: '48.2k views · 35m ago',
      image: 'https://example.test/a.jpg',
      videoUrl: 'https://example.test/a.mp4'
    })
  })
})
