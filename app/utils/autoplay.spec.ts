import { describe, expect, it } from 'vitest'
import type { RelatedItem } from '#shared/types/watch'
import { pickAutoplayNext, shouldAutoplay } from './autoplay'

function item(id: string, kind: RelatedItem['kind'] = 'clip'): RelatedItem {
  return {
    id,
    slug: id,
    kind,
    title: `Title ${id}`,
    channel: 'Nova_Beats',
    image: 'https://example.test/i.jpg',
    videoUrl: 'https://example.test/v.mp4',
    meta: '1k views'
  }
}

describe('pickAutoplayNext', () => {
  it('takes the first clip in the rail', () => {
    expect(pickAutoplayNext([item('a'), item('b')], 'current')?.id).toBe('a')
  })

  // Dropping someone into an endless broadcast is not "play the next video".
  it('skips live entries and keeps looking', () => {
    expect(pickAutoplayNext([item('l1', 'live'), item('c1')], 'current')?.id).toBe('c1')
  })

  it('never advances to the video already playing', () => {
    expect(pickAutoplayNext([item('same'), item('other')], 'same')?.id).toBe('other')
  })

  it('returns null when the rail holds nothing playable', () => {
    expect(pickAutoplayNext([item('l1', 'live')], 'current')).toBeNull()
    expect(pickAutoplayNext([], 'current')).toBeNull()
  })
})

describe('shouldAutoplay', () => {
  const base = { enabled: true, isLive: false, hasPlaylistNext: false, next: item('a') }

  it('runs for a finished clip with somewhere to go', () => {
    expect(shouldAutoplay(base)).toBe(true)
  })

  it('stays out of the way when the viewer turned it off', () => {
    expect(shouldAutoplay({ ...base, enabled: false })).toBe(false)
  })

  // A live stream has no end to advance from.
  it('never runs on a live stream', () => {
    expect(shouldAutoplay({ ...base, isLive: true })).toBe(false)
  })

  // The playlist is an explicit queue and outranks a suggestion.
  it('yields to a playlist that has its own next item', () => {
    expect(shouldAutoplay({ ...base, hasPlaylistNext: true })).toBe(false)
  })

  it('does nothing with nowhere to go', () => {
    expect(shouldAutoplay({ ...base, next: null })).toBe(false)
  })
})
