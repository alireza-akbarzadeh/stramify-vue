// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { filterUpNext, upNextHasBothKinds } from './upNext'
import type { RelatedItem } from '#shared/types/watch'

function item(overrides: Partial<RelatedItem> = {}): RelatedItem {
  return {
    id: 'clip-1',
    slug: 'clip-1',
    kind: 'clip',
    title: 'Ranked ladder push',
    channel: 'nova',
    image: '/thumb.jpg',
    videoUrl: '/clip.mp4',
    meta: '12.4k views · 3 days ago',
    duration: '02:45',
    ...overrides
  }
}

const rail = [
  item(),
  item({ id: 'clip-2', title: 'Chill lo-fi session', channel: 'auralab' }),
  item({ id: 'live-1', kind: 'live', title: 'Late night jam', channel: 'nova' })
]

describe('filterUpNext', () => {
  it('returns everything when nothing is asked of it', () => {
    expect(filterUpNext(rail, '', 'all')).toEqual(rail)
  })

  it('ignores a query that is only whitespace', () => {
    expect(filterUpNext(rail, '   ', 'all')).toEqual(rail)
  })

  it('matches the title and the channel, case-insensitively', () => {
    expect(filterUpNext(rail, 'LO-FI', 'all').map((entry) => entry.id)).toEqual(['clip-2'])
    expect(filterUpNext(rail, 'auralab', 'all').map((entry) => entry.id)).toEqual(['clip-2'])
  })

  it('ANDs terms across fields, which a substring match could not', () => {
    // "nova" is the channel and "ranked" is in the title; the two words never
    // sit next to each other in either field.
    expect(filterUpNext(rail, 'nova ranked', 'all').map((entry) => entry.id)).toEqual(['clip-1'])
    expect(filterUpNext(rail, 'nova lo-fi', 'all')).toEqual([])
  })

  it('does not match on the pre-formatted meta line', () => {
    // Every fixture says "3 days ago"; matching it would hit all three.
    expect(filterUpNext(rail, 'views', 'all')).toEqual([])
  })

  it('narrows by kind', () => {
    expect(filterUpNext(rail, '', 'live').map((entry) => entry.id)).toEqual(['live-1'])
    expect(filterUpNext(rail, '', 'clip').map((entry) => entry.id)).toEqual(['clip-1', 'clip-2'])
  })

  it('applies the query and the kind together', () => {
    expect(filterUpNext(rail, 'nova', 'live').map((entry) => entry.id)).toEqual(['live-1'])
    expect(filterUpNext(rail, 'ladder', 'live')).toEqual([])
  })
})

describe('upNextHasBothKinds', () => {
  it('is true only when the rail holds a live session and a clip', () => {
    expect(upNextHasBothKinds(rail)).toBe(true)
    expect(upNextHasBothKinds([item(), item({ id: 'clip-2' })])).toBe(false)
    expect(upNextHasBothKinds([item({ kind: 'live' })])).toBe(false)
    expect(upNextHasBothKinds([])).toBe(false)
  })
})
