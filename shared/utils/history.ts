/**
 * Pure helpers behind `/history` — the day grouping and the copy, with no
 * database or component in sight so both sides of the wire can use them and a
 * spec can pin them down. Sibling of `shared/utils/library.ts`, which owns the
 * resume arithmetic these build on.
 */

import { formatRemaining } from './library'
import type { HistoryItem } from '../types/history'

/** A day's worth of rows, as the page renders it under one heading. */
export interface HistoryGroup {
  /** Local `YYYY-MM-DD`. Stable `v-for` key, and what the labels compare on. */
  key: string
  /** `"Today"`, `"Yesterday"`, or `"Monday, 3 August"`. */
  label: string
  items: HistoryItem[]
}

/**
 * The bar's caption: what's left, or that there's nothing left.
 *
 * `completed` wins over the arithmetic rather than being inferred from the
 * position, because finishing a clip resets most players' playhead to 0 — a
 * position-only rule would caption a video you just finished as "12 min left".
 */
export function historyProgressLabel(
  positionSeconds: number,
  durationSeconds: number,
  completed: boolean
): string {
  return completed ? 'Watched' : formatRemaining(positionSeconds, durationSeconds)
}

/**
 * Local calendar day as `YYYY-MM-DD`.
 *
 * Built from the date's own parts rather than `toISOString().slice(0, 10)`,
 * which is UTC: a clip watched at 9pm in Tehran would otherwise land on the
 * next day's heading. Constructed by hand rather than via a locale format so
 * the key is the same string in every locale — only the *label* is localised.
 */
export function historyDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Rows → day groups, preserving the order they arrived in.
 *
 * A `Map` rather than a sort, for the same reason `groupByChannel` uses one:
 * the query already ordered by recency, and insertion order is the one thing a
 * `Map` guarantees. Re-sorting here would write the ordering down twice.
 *
 * `now` is injectable so the spec can pin "Today" to a fixed date instead of
 * being a test that breaks at midnight.
 */
export function groupHistoryByDay(items: HistoryItem[], now: Date = new Date()): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>()

  for (const item of items) {
    const date = new Date(item.watchedAt)
    // A row whose timestamp the server mangled shouldn't take the whole page
    // down with an "Invalid Date" heading — drop it and render the rest.
    if (Number.isNaN(date.getTime())) continue

    const key = historyDayKey(date)
    let group = groups.get(key)

    if (!group) {
      group = { key, label: historyDayLabel(date, now), items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
  }

  return [...groups.values()]
}

/**
 * A day heading. Relative for the two days a viewer thinks of by name, absolute
 * beyond that — "3 days ago" is a worse heading than the date itself once
 * you're scrolling back through months.
 */
export function historyDayLabel(date: Date, now: Date = new Date()): string {
  const key = historyDayKey(date)
  if (key === historyDayKey(now)) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === historyDayKey(yesterday)) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    // Only once the year stops being obvious — "Monday, 3 August 2025" on a
    // row from last week is noise.
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
  })
}

/** Clock time a row was watched, in the viewer's locale — e.g. `"21:04"`. */
export function historyTimeLabel(watchedAt: string): string {
  const date = new Date(watchedAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Where a history row points.
 *
 * Finished clips restart from the top: `?t=` on something you've already
 * watched would drop you at the credits. Unfinished ones carry the resume
 * position, same convention as the Continue-watching card.
 */
export function historyHref(item: HistoryItem): string {
  const path = `/watch/${encodeURIComponent(item.slug)}`
  if (item.completed || item.positionSeconds <= 0) return path
  return `${path}?t=${Math.floor(item.positionSeconds)}`
}
