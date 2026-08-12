// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  formatRemaining,
  isResumable,
  movedPlaylistItems,
  playlistCountLabel,
  playlistWatchHref,
  progressPercent,
  RESUME_MAX_FRACTION,
  RESUME_MIN_SECONDS,
  resumeHref
} from './library'

describe('progressPercent', () => {
  it('reports how far through the clip the playhead is', () => {
    expect(progressPercent(30, 120)).toBe(25)
  })

  it('clamps past the end rather than reporting over 100', () => {
    // A player can over-report against a bad manifest duration; the bar must
    // still stop at full.
    expect(progressPercent(150, 120)).toBe(100)
  })

  it('is 0 for a clip with no known runtime, instead of dividing by zero', () => {
    expect(progressPercent(30, 0)).toBe(0)
  })
})

describe('isResumable', () => {
  it('rejects a clip barely started — that is a misclick, not a watch', () => {
    expect(isResumable(RESUME_MIN_SECONDS - 1, 600, false)).toBe(false)
    expect(isResumable(RESUME_MIN_SECONDS, 600, false)).toBe(true)
  })

  it('rejects a clip watched to within the tail of its end', () => {
    const duration = 600
    expect(isResumable(duration * RESUME_MAX_FRACTION, duration, false)).toBe(false)
    expect(isResumable(duration * RESUME_MAX_FRACTION - 1, duration, false)).toBe(true)
  })

  it('rejects anything already marked completed', () => {
    expect(isResumable(300, 600, true)).toBe(false)
  })
})

describe('formatRemaining', () => {
  it('rounds up, so the label never undersells what is left', () => {
    // 90s left is "2 min", not "1 min" — a minute later it would still be running.
    expect(formatRemaining(30, 120)).toBe('2 min left')
  })

  it('avoids a bare "0 min" for the last stretch', () => {
    expect(formatRemaining(100, 120)).toBe('under a minute left')
  })

  it('switches to hours past sixty minutes', () => {
    expect(formatRemaining(0, 4320)).toBe('1h 12m left')
  })
})

describe('resumeHref', () => {
  it('carries the position as ?t=, floored to a whole second', () => {
    expect(resumeHref('clip-midnight-echo', 92.7)).toBe('/watch/clip-midnight-echo?t=92')
  })

  it('omits ?t= at the start of a clip', () => {
    expect(resumeHref('clip-midnight-echo', 0)).toBe('/watch/clip-midnight-echo')
  })

  it('encodes a slug that needs it', () => {
    expect(resumeHref('a b', 10)).toBe('/watch/a%20b?t=10')
  })
})

describe('playlistCountLabel', () => {
  it('reads as a sentence for an empty playlist rather than "0 videos"', () => {
    expect(playlistCountLabel(0)).toBe('No videos yet')
  })

  it('is singular at one', () => {
    expect(playlistCountLabel(1)).toBe('1 video')
    expect(playlistCountLabel(2)).toBe('2 videos')
  })
})

describe('playlistWatchHref', () => {
  it('carries the playlist as ?list= so the queue survives the hop', () => {
    expect(playlistWatchHref('clip-rendering', 'pl-1')).toBe('/watch/clip-rendering?list=pl-1')
  })

  it('is a plain watch link with no playlist', () => {
    expect(playlistWatchHref('clip-rendering', '')).toBe('/watch/clip-rendering')
  })

  it('encodes both halves', () => {
    expect(playlistWatchHref('a b', 'p/1')).toBe('/watch/a%20b?list=p%2F1')
  })
})

describe('movedPlaylistItems', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('swaps an item with the one above it', () => {
    expect(movedPlaylistItems(items, 'b', 'up').map((item) => item.id)).toEqual(['b', 'a', 'c'])
  })

  it('swaps an item with the one below it', () => {
    expect(movedPlaylistItems(items, 'b', 'down').map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })

  it('leaves the source array untouched', () => {
    movedPlaylistItems(items, 'b', 'up')
    expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  // The same reference is the signal callers use to skip a cache write, so
  // these assert identity rather than deep equality.
  it('returns the same array at the top of the list', () => {
    expect(movedPlaylistItems(items, 'a', 'up')).toBe(items)
  })

  it('returns the same array at the bottom of the list', () => {
    expect(movedPlaylistItems(items, 'c', 'down')).toBe(items)
  })

  it('returns the same array for an id that is not in the list', () => {
    expect(movedPlaylistItems(items, 'nope', 'up')).toBe(items)
  })
})
