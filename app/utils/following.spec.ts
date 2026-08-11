import { describe, expect, it } from 'vitest'
import {
  dropFollowedChannel,
  dropFollowingShelf,
  followingSummary,
  setFollowedNotify,
  storyRing,
  storyRingLabel,
  storyTarget,
  videoCountLabel
} from './following'
import type { FollowedChannel, FollowingShelf } from '#shared/types/following'

function channel(overrides: Partial<FollowedChannel> = {}): FollowedChannel {
  return {
    handle: 'canvas_queen',
    name: 'Canvas Queen',
    tagline: 'Illustration and long finishing passes.',
    avatarUrl: null,
    bannerUrl: null,
    verified: true,
    followerCount: 1240,
    clipCount: 4,
    isLive: false,
    liveTitle: null,
    liveSlug: null,
    notify: 'all',
    followedAt: '2026-08-01T00:00:00.000Z',
    hasNew: false,
    categories: ['Creative'],
    ...overrides
  }
}

describe('story ring state', () => {
  it('lights only for live or a fresh upload', () => {
    expect(storyRing(channel())).toBe('quiet')
    expect(storyRing(channel({ hasNew: true }))).toBe('new')
    expect(storyRing(channel({ isLive: true }))).toBe('live')
  })

  it('prefers live over new — a live channel that also uploaded is still live', () => {
    expect(storyRing(channel({ isLive: true, hasNew: true }))).toBe('live')
  })

  it('says in words what the ring says in colour', () => {
    expect(storyRingLabel(channel())).toBe('Canvas Queen')
    expect(storyRingLabel(channel({ hasNew: true }))).toBe('Canvas Queen, new this week')
    expect(
      storyRingLabel(channel({ isLive: true, liveTitle: 'Finishing the cover commission' }))
    ).toBe('Canvas Queen is live now: Finishing the cover commission')
  })

  it('names a live channel even when the session has no title', () => {
    expect(storyRingLabel(channel({ isLive: true }))).toBe('Canvas Queen is live now')
  })
})

describe('story target', () => {
  it('goes to the channel page when offline', () => {
    expect(storyTarget(channel())).toBe('/channel/canvas_queen')
  })

  it('goes straight to the broadcast when live, in the streamer casing', () => {
    expect(storyTarget(channel({ isLive: true, liveSlug: 'Canvas_Queen' }))).toBe(
      '/watch/Canvas_Queen'
    )
  })

  it('falls back to the channel page if a live row somehow has no slug', () => {
    expect(storyTarget(channel({ isLive: true, liveSlug: null }))).toBe('/channel/canvas_queen')
  })

  it('escapes the slug so it cannot break out of the path segment', () => {
    expect(storyTarget(channel({ isLive: true, liveSlug: 'a/b' }))).toBe('/watch/a%2Fb')
  })
})

describe('cache edits', () => {
  const list = [channel(), channel({ handle: 'viper_squadron', name: 'Viper Squadron' })]

  it('removes exactly one channel from the followed list', () => {
    expect(dropFollowedChannel(list, 'canvas_queen')).toEqual([list[1]])
  })

  it('removes that channel’s shelf too', () => {
    const shelves = [
      { channel: { handle: 'canvas_queen' }, videos: [] },
      { channel: { handle: 'viper_squadron' }, videos: [] }
    ] as unknown as FollowingShelf[]
    expect(dropFollowingShelf(shelves, 'canvas_queen')).toEqual([shelves[1]])
  })

  it('leaves an unfetched cache alone rather than inventing an empty one', () => {
    expect(dropFollowedChannel(undefined, 'canvas_queen')).toBeUndefined()
    expect(dropFollowingShelf(undefined, 'canvas_queen')).toBeUndefined()
    expect(setFollowedNotify(undefined, 'canvas_queen', 'live')).toBeUndefined()
  })

  it('moves one channel’s bell without touching its neighbours', () => {
    const next = setFollowedNotify(list, 'canvas_queen', 'live')
    expect(next?.[0]?.notify).toBe('live')
    expect(next?.[1]).toBe(list[1])
  })
})

describe('labels', () => {
  it('pluralises video counts', () => {
    expect(videoCountLabel(1)).toBe('1 video')
    expect(videoCountLabel(0)).toBe('0 videos')
    expect(videoCountLabel(12)).toBe('12 videos')
  })

  it('summarises the page, mentioning live only when someone is', () => {
    expect(followingSummary([channel()])).toBe('1 channel')
    expect(followingSummary([channel(), channel({ handle: 'a' })])).toBe('2 channels')
    expect(followingSummary([channel({ isLive: true }), channel({ handle: 'a' })])).toBe(
      '2 channels · 1 live'
    )
  })
})
