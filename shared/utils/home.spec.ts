import { describe, expect, it } from 'vitest'
import { ALL_CHIP, buildHomeChips, findHomeChip, homeFilterLabel, homeReasonLabel } from './home'
import type { CategorySummary } from '../types/discovery'

function summary(overrides: Partial<CategorySummary> = {}): CategorySummary {
  return {
    slug: 'music',
    name: 'Music',
    description: 'Live sets.',
    clipCount: 3,
    totalViews: '21.3k',
    previewImage: null,
    ...overrides
  }
}

describe('buildHomeChips', () => {
  it('always leads with All then Live', () => {
    const [first, second] = buildHomeChips([])
    expect(first).toEqual(ALL_CHIP)
    expect(second?.id).toBe('live')
    expect(second?.live).toBe(true)
  })

  it('appends one chip per category, carrying its slug as the filter', () => {
    const chips = buildHomeChips([summary(), summary({ slug: 'gaming', name: 'Gaming' })])
    expect(chips.map((chip) => chip.label)).toEqual(['All', 'Live', 'Music', 'Gaming'])
    expect(chips[2]).toMatchObject({ id: 'music', category: 'music', live: false })
  })

  it('offers no category chip when nothing is published', () => {
    expect(buildHomeChips([])).toHaveLength(2)
  })

  it('leaves the All chip with no filter at all', () => {
    expect(ALL_CHIP.category).toBeNull()
    expect(ALL_CHIP.live).toBe(false)
  })
})

describe('findHomeChip', () => {
  const chips = buildHomeChips([summary()])

  it('finds a chip by id', () => {
    expect(findHomeChip(chips, 'music')?.label).toBe('Music')
  })

  it('falls back to All for an id that no longer exists', () => {
    // A category can empty out between renders — the bar must not end up with
    // a selection that matches nothing.
    expect(findHomeChip(chips, 'podcasts')).toEqual(ALL_CHIP)
  })
})

describe('homeFilterLabel', () => {
  it('names the unfiltered feed rather than echoing the chip', () => {
    expect(homeFilterLabel(ALL_CHIP)).toBe('your feed')
  })

  it('uses the chip label for a real filter', () => {
    const chips = buildHomeChips([summary({ slug: 'gaming', name: 'Gaming' })])
    expect(homeFilterLabel(chips[2]!)).toBe('Gaming')
  })
})

describe('homeReasonLabel', () => {
  it('names the channel for a follow', () => {
    expect(homeReasonLabel('following', 'Nova_Beats')).toBe('Because you follow Nova_Beats')
  })

  it('labels live and new without naming the channel', () => {
    expect(homeReasonLabel('live', 'Nova_Beats')).toBe('Live now')
    expect(homeReasonLabel('new', 'Nova_Beats')).toBe('New upload')
  })
})
