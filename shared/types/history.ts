import type { RelatedItem } from './watch'

/**
 * One row of `/history` — a clip you've watched, and how far you got.
 *
 * Extends `RelatedItem` like `ContinueWatchingItem` does, so the row reuses the
 * same title/channel/thumbnail vocabulary every other card on the site speaks.
 * The difference from the Continue-watching rail is what's *not* filtered out:
 * history keeps finished clips and barely-started ones, because "what have I
 * watched" and "what can I resume" are different questions over the same table.
 */
export interface HistoryItem extends RelatedItem {
  /** Where the playhead was, in whole seconds. Also the `?t=` on the link. */
  positionSeconds: number
  /** How full the bar is, 0–100, already clamped server-side. */
  percent: number
  /** Pre-formatted, e.g. `"4 min left"` or `"Watched"`. */
  progressLabel: string
  /** Watched to the end — the row's bar is full and its link restarts. */
  completed: boolean
  /**
   * When it was last watched, ISO 8601.
   *
   * Raw rather than pre-formatted, unlike every other string on this type. Day
   * grouping ("Today" / "Yesterday") and the clock label depend on the viewer's
   * timezone, which the server doesn't know — formatting it here would put a
   * date on screen that's off by a day for half the world. `shared/utils/history`
   * does the formatting in the browser instead.
   */
  watchedAt: string
  avatarUrl: string | null
}

/** One page of history, newest first. `nextCursor` is null at the end. */
export interface HistoryPage {
  items: HistoryItem[]
  nextCursor: number | null
}

/**
 * Rows per request. Larger than the home feed's page because these are list
 * rows, not grid cards — a screenful of them is more items.
 */
export const HISTORY_PAGE_SIZE = 30

/** Longest accepted search term, enforced by Zod at the API boundary. */
export const HISTORY_QUERY_MAX = 100
