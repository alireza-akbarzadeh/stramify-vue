// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mixHref, mixId, mixReason, mixSubtitle, mixTitle, parseMixId } from './mix'
import type { MixSummary } from '../types/mix'

describe('mixId / parseMixId', () => {
  it('round-trips a seed and key', () => {
    expect(parseMixId(mixId('channel', 'Viper_Squadron'))).toEqual({
      seed: 'channel',
      key: 'viper_squadron'
    })
  })

  it('lowercases the key, because every handle lookup joins on lower(...)', () => {
    expect(mixId('channel', 'Viper_Squadron')).toBe('channel:viper_squadron')
  })

  it('keeps colons that appear inside the key', () => {
    // Only the first separator splits, so a key is never silently truncated.
    expect(parseMixId('category:a:b')).toEqual({ seed: 'category', key: 'a:b' })
  })

  it('returns null for anything that is not a mix id', () => {
    // A hand-typed id and an unknown seed both become a 404 upstream.
    expect(parseMixId('nonsense')).toBeNull()
    expect(parseMixId('playlist:abc')).toBeNull()
    expect(parseMixId('channel:')).toBeNull()
    expect(parseMixId(':abc')).toBeNull()
  })
})

describe('mixReason', () => {
  it('prefers the follow, which is the stronger and more explicit signal', () => {
    expect(mixReason(true, 9)).toBe('followed')
  })

  it('falls back to watch history, then to nothing personal at all', () => {
    expect(mixReason(false, 3)).toBe('watched')
    expect(mixReason(false, 0)).toBe('popular')
  })
})

describe('mixSubtitle', () => {
  it('only claims you follow a channel when you actually do', () => {
    expect(mixSubtitle('channel', 'Viper_Squadron', 'followed')).toBe(
      'Because you follow Viper_Squadron'
    )
    expect(mixSubtitle('channel', 'Viper_Squadron', 'watched')).toBe(
      'Because you watched Viper_Squadron'
    )
  })

  // Signed out, channel mixes are seeded by reach. Telling that viewer
  // "because you watched" would be a claim about them that isn't true.
  it('makes no claim about the viewer for a popularity-seeded mix', () => {
    expect(mixSubtitle('channel', 'Viper_Squadron', 'popular')).toBe(
      'Popular from Viper_Squadron'
    )
  })

  it('describes a category mix by what is in it, not by the viewer', () => {
    expect(mixSubtitle('category', 'Gaming', 'popular')).toBe('Top in Gaming right now')
  })
})

describe('mixTitle', () => {
  it('names the mix after its seed', () => {
    expect(mixTitle('Gaming')).toBe('Gaming mix')
  })
})

describe('mixHref', () => {
  it('encodes the id so the colon survives the URL', () => {
    const mix = { id: 'channel:viper_squadron' } as MixSummary
    expect(mixHref(mix)).toBe('/mix/channel%3Aviper_squadron')
  })
})
