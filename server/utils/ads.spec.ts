import { describe, expect, it } from 'vitest'
import { isAdFree, pickWeighted } from './ads'

describe('isAdFree', () => {
  // The entitlement this whole feature is sold on.
  it('exempts every paid tier', () => {
    expect(isAdFree('creator')).toBe(true)
    expect(isAdFree('studio')).toBe(true)
  })

  it('serves ads to the free tier', () => {
    expect(isAdFree('starter')).toBe(false)
  })
})

describe('pickWeighted', () => {
  const rows = [
    { id: 'a', weight: 3 },
    { id: 'b', weight: 1 }
  ]

  // Deterministic on `roll`, which is the only way to assert weight is applied
  // rather than merely read: 'a' owns the first 3/4 of the range.
  it('gives a heavier row proportionally more of the range', () => {
    expect(pickWeighted(rows, 0)?.id).toBe('a')
    expect(pickWeighted(rows, 0.7)?.id).toBe('a')
    expect(pickWeighted(rows, 0.8)?.id).toBe('b')
  })

  it('returns the last weighted row at the very top of the range', () => {
    expect(pickWeighted(rows, 1)?.id).toBe('b')
  })

  // Weight 0 is how a campaign is paused without deleting its row.
  it('never selects a zero-weight row', () => {
    const paused = [{ id: 'off', weight: 0 }, { id: 'on', weight: 2 }]
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      expect(pickWeighted(paused, roll)?.id).toBe('on')
    }
  })

  it('returns null when there is nothing servable', () => {
    expect(pickWeighted([], 0.5)).toBeNull()
    expect(pickWeighted([{ id: 'off', weight: 0 }], 0.5)).toBeNull()
  })
})
