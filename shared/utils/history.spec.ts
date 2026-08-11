// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  groupHistoryByDay,
  historyDayKey,
  historyDayLabel,
  historyHref,
  historyProgressLabel,
  historyTimeLabel
} from './history'
import type { HistoryItem } from '../types/history'

/** A row with only the fields these helpers read; the rest is card furniture. */
function item(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'clip-1',
    slug: 'clip-1',
    kind: 'clip',
    title: 'A clip',
    channel: 'Someone',
    image: '/thumb.jpg',
    videoUrl: '/clip.mp4',
    meta: '1.2k views',
    duration: '10:00',
    positionSeconds: 120,
    percent: 20,
    progressLabel: '8 min left',
    completed: false,
    watchedAt: new Date(2026, 7, 11, 21, 4).toISOString(),
    avatarUrl: null,
    ...overrides
  }
}

describe('historyProgressLabel', () => {
  it('says what is left on a clip still in progress', () => {
    expect(historyProgressLabel(120, 600, false)).toBe('8 min left')
  })

  it('says "Watched" for a finished clip even though its playhead reset to 0', () => {
    // Most players rewind on `ended`, so the position alone would read as
    // "never started" — the flag has to win.
    expect(historyProgressLabel(0, 600, true)).toBe('Watched')
  })
})

describe('historyDayKey', () => {
  it('uses the local calendar day, not UTC', () => {
    // 21:04 local is already the next day in UTC east of the meridian; the
    // heading must follow the viewer's clock, not the server's.
    const late = new Date(2026, 7, 11, 21, 4)
    expect(historyDayKey(late)).toBe('2026-08-11')
  })

  it('zero-pads so keys sort and compare as strings', () => {
    expect(historyDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('historyDayLabel', () => {
  const now = new Date(2026, 7, 11, 12, 0)

  it('names today and yesterday relatively', () => {
    expect(historyDayLabel(new Date(2026, 7, 11, 8, 0), now)).toBe('Today')
    expect(historyDayLabel(new Date(2026, 7, 10, 23, 0), now)).toBe('Yesterday')
  })

  it('crosses a month boundary backwards without landing on day 0', () => {
    const firstOfMonth = new Date(2026, 7, 1, 9, 0)
    expect(historyDayLabel(new Date(2026, 6, 31, 9, 0), firstOfMonth)).toBe('Yesterday')
  })

  it('falls back to an absolute date further back', () => {
    const label = historyDayLabel(new Date(2026, 7, 3, 9, 0), now)
    expect(label).not.toBe('Today')
    expect(label).not.toBe('Yesterday')
    expect(label).toContain('3')
  })

  it('adds the year only once it stops being the current one', () => {
    expect(historyDayLabel(new Date(2025, 10, 2, 9, 0), now)).toContain('2025')
    expect(historyDayLabel(new Date(2026, 4, 2, 9, 0), now)).not.toContain('2026')
  })
})

describe('groupHistoryByDay', () => {
  const now = new Date(2026, 7, 11, 12, 0)

  it('groups consecutive rows from the same day under one heading', () => {
    const groups = groupHistoryByDay(
      [
        item({ id: 'a', watchedAt: new Date(2026, 7, 11, 11, 0).toISOString() }),
        item({ id: 'b', watchedAt: new Date(2026, 7, 11, 9, 0).toISOString() }),
        item({ id: 'c', watchedAt: new Date(2026, 7, 10, 22, 0).toISOString() })
      ],
      now
    )

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday'])
    expect(groups[0]?.items.map((row) => row.id)).toEqual(['a', 'b'])
    expect(groups[1]?.items.map((row) => row.id)).toEqual(['c'])
  })

  it('preserves the order the query returned rather than re-sorting', () => {
    const groups = groupHistoryByDay(
      [
        item({ id: 'older', watchedAt: new Date(2026, 7, 9, 10, 0).toISOString() }),
        item({ id: 'newer', watchedAt: new Date(2026, 7, 11, 10, 0).toISOString() })
      ],
      now
    )
    expect(groups.map((group) => group.items[0]?.id)).toEqual(['older', 'newer'])
  })

  it('drops a row with an unparseable timestamp instead of heading it "Invalid Date"', () => {
    const groups = groupHistoryByDay(
      [item({ id: 'bad', watchedAt: 'not-a-date' }), item({ id: 'good' })],
      now
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.items.map((row) => row.id)).toEqual(['good'])
  })

  it('returns nothing for nothing, so the caller can render its empty state', () => {
    expect(groupHistoryByDay([], now)).toEqual([])
  })
})

describe('historyTimeLabel', () => {
  it('formats the clock time a row was watched', () => {
    expect(historyTimeLabel(new Date(2026, 7, 11, 21, 4).toISOString())).toMatch(/\d/)
  })

  it('is empty for a broken timestamp rather than "Invalid Date"', () => {
    expect(historyTimeLabel('nope')).toBe('')
  })
})

describe('historyHref', () => {
  it('carries the resume position on an unfinished clip', () => {
    expect(historyHref(item({ slug: 'abc', positionSeconds: 125 }))).toBe('/watch/abc?t=125')
  })

  it('restarts a finished clip instead of dropping the viewer at the credits', () => {
    expect(historyHref(item({ slug: 'abc', positionSeconds: 590, completed: true }))).toBe(
      '/watch/abc'
    )
  })

  it('omits ?t= at position zero', () => {
    expect(historyHref(item({ slug: 'abc', positionSeconds: 0 }))).toBe('/watch/abc')
  })

  it('encodes a slug that would otherwise break the path', () => {
    expect(historyHref(item({ slug: 'a/b', positionSeconds: 0 }))).toBe('/watch/a%2Fb')
  })
})
