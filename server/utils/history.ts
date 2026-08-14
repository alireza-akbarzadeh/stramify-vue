import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { channels, clips, watchProgress } from '../db/schema'
import { formatCount } from '#shared/utils/format'
import { historyProgressLabel } from '#shared/utils/history'
import { progressPercent } from '#shared/utils/library'
import type { HistoryItem, HistoryPage } from '#shared/types/history'

/**
 * `/history` — every clip this viewer has watched, most recent first.
 *
 * The same `watch_progress` table behind the Continue-watching rail, read
 * without its filters. That table is a resume marker (one row per user per
 * clip, rewritten in place), not a play log, so history shows the *last* time
 * you watched each video and a rewatch moves the row to the top rather than
 * adding a second one. That's the visible behaviour viewers already expect from
 * a history list; a per-play event table would be a different shape and a
 * Phase 12 analytics concern — see `server/db/schema/watch-progress.ts`.
 */

interface HistoryQuery {
  userId: string
  /** Row offset. Offset paging, same as the home feed — see `selectHistory`. */
  cursor: number
  limit: number
  /** Free-text filter over title and channel. Empty string means unfiltered. */
  search: string
}

export async function selectHistory({
  userId,
  cursor,
  limit,
  search
}: HistoryQuery): Promise<HistoryPage> {
  const rows = await db
    .select({
      id: clips.id,
      title: clips.title,
      creator: clips.creator,
      thumbnailUrl: clips.thumbnailUrl,
      videoUrl: clips.videoUrl,
      views: clips.views,
      durationSeconds: clips.durationSeconds,
      positionSeconds: watchProgress.positionSeconds,
      completed: watchProgress.completed,
      updatedAt: watchProgress.updatedAt,
      avatarUrl: channels.avatarUrl
    })
    .from(watchProgress)
    // Inner join, so a clip deleted since it was watched drops out of history
    // rather than rendering a row with no title and a broken thumbnail. The FK
    // cascades anyway; this is the belt to that braces.
    .innerJoin(clips, eq(clips.id, watchProgress.clipId))
    .leftJoin(channels, eq(channels.handle, sql`lower(${clips.creator})`))
    .where(and(eq(watchProgress.userId, userId), searchFilter(search)))
    // Matches `watch_progress_user_updated_idx`, so this is an index scan
    // rather than a sort over everything the viewer has ever watched.
    .orderBy(desc(watchProgress.updatedAt))
    // One extra row purely to answer "is there a next page" without a second
    // count query. It's sliced off before the payload is built.
    .limit(limit + 1)
    .offset(cursor)

  const hasMore = rows.length > limit
  return {
    items: rows.slice(0, limit).map(toHistoryItem),
    nextCursor: hasMore ? cursor + limit : null
  }
}

/**
 * Title-or-channel contains, case-insensitively. `undefined` when there's no
 * term, which `and()` drops — a `%%` LIKE would match every row but force a
 * scan to prove it.
 *
 * `%` and `_` in the term are escaped so a viewer searching for a literal
 * underscore doesn't get a single-character wildcard, and a lone `%` doesn't
 * match their entire history.
 */
function searchFilter(search: string) {
  const term = search.trim()
  if (!term) return undefined

  const pattern = `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
  return or(ilike(clips.title, pattern), ilike(clips.creator, pattern))
}

/** Forget everything — "Clear all watch history". Returns how many rows went. */
export async function clearHistory(userId: string): Promise<number> {
  const removed = await db
    .delete(watchProgress)
    .where(eq(watchProgress.userId, userId))
    .returning({ id: watchProgress.id })

  return removed.length
}

/** One joined `watch_progress` + `clips` row, as the select above shapes it. */
interface HistoryRow {
  id: string
  title: string
  creator: string
  thumbnailUrl: string
  videoUrl: string
  views: number
  durationSeconds: number
  positionSeconds: number
  completed: boolean
  updatedAt: Date
  avatarUrl: string | null
}

function toHistoryItem(row: HistoryRow): HistoryItem {
  return {
    id: row.id,
    slug: row.id,
    kind: 'clip',
    title: row.title,
    channel: row.creator,
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    meta: `${formatCount(row.views)} views`,
    duration: formatDuration(row.durationSeconds),
    positionSeconds: row.positionSeconds,
    // A finished clip's bar is full whatever its playhead says — see
    // `historyProgressLabel` for why the flag beats the arithmetic.
    percent: row.completed ? 100 : progressPercent(row.positionSeconds, row.durationSeconds),
    progressLabel: historyProgressLabel(row.positionSeconds, row.durationSeconds, row.completed),
    completed: row.completed,
    watchedAt: row.updatedAt.toISOString(),
    avatarUrl: row.avatarUrl
  }
}
