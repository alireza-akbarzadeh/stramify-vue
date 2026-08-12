import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { channels, clips, watchProgress } from '../db/schema'
import { formatDuration } from './format'
import { formatCount } from '#shared/utils/format'
import {
  formatRemaining,
  isResumable,
  progressPercent,
  RESUME_MAX_FRACTION,
  RESUME_MIN_SECONDS
} from '#shared/utils/library'
import type { ContinueWatchingItem, WatchProgressUpdate } from '#shared/types/library'

/** How many cards the rail holds. One screenful; it scrolls past that. */
const CONTINUE_LIMIT = 12

/**
 * Record where a viewer is in a clip.
 *
 * An upsert on the `(user, clip)` unique index rather than a read-then-write:
 * the player posts this every few seconds from a tab that may have siblings
 * open on the same video, and two concurrent writes must end with one row, not
 * a constraint violation the client has to retry.
 *
 * `completed` is sticky — once you finish a clip, a later ping from a scrub
 * back to the middle shouldn't quietly un-finish it and put it back in your
 * rail. Clearing it is what `deleteWatchProgress` (the card's "remove") is for.
 */
export async function upsertWatchProgress(
  userId: string,
  clipId: string,
  update: WatchProgressUpdate,
  /** The clip's runtime, taken from its row — never from the client. */
  durationSeconds: number
): Promise<void> {
  await db
    .insert(watchProgress)
    .values({
      id: crypto.randomUUID(),
      userId,
      clipId,
      positionSeconds: update.positionSeconds,
      durationSeconds,
      completed: update.completed
    })
    .onConflictDoUpdate({
      target: [watchProgress.userId, watchProgress.clipId],
      set: {
        positionSeconds: update.positionSeconds,
        durationSeconds,
        completed: sql`${watchProgress.completed} or ${update.completed}`,
        updatedAt: new Date()
      }
    })
}

/** Forget a clip's position — the card's "Remove from Continue watching". */
export async function deleteWatchProgress(userId: string, clipId: string): Promise<void> {
  await db
    .delete(watchProgress)
    .where(and(eq(watchProgress.userId, userId), eq(watchProgress.clipId, clipId)))
}

/**
 * Started but unfinished, most recently watched first.
 *
 * The resumable window is applied in SQL as well as in `isResumable` on the
 * mapped rows: the predicate keeps the `limit` honest (otherwise a viewer with
 * thirty finished clips gets a rail of two), and the mapper keeps the rule
 * itself in one shared, tested place rather than only in a WHERE clause.
 */
export async function selectContinueWatching(
  userId: string | null
): Promise<ContinueWatchingItem[]> {
  if (!userId) return []

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
      avatarUrl: channels.avatarUrl
    })
    .from(watchProgress)
    .innerJoin(clips, eq(clips.id, watchProgress.clipId))
    .leftJoin(channels, eq(channels.handle, sql`lower(${clips.creator})`))
    .where(
      and(
        eq(watchProgress.userId, userId),
        eq(watchProgress.completed, false),
        // Shorts have their own feed and their own resume behaviour (none) —
        // same rule every landscape surface follows.
        eq(clips.orientation, 'landscape'),
        sql`${watchProgress.positionSeconds} >= ${RESUME_MIN_SECONDS}`,
        // `::float8` is load-bearing. Left off, Postgres resolves
        // `integer * $n` by picking `integer * integer` and then fails to parse
        // the bound `0.95` as an integer — a 22P02 at query time, not a type
        // error at build time, so the whole rail 500s for every signed-in
        // viewer. Casting the parameter tells the planner which operator to
        // pick. Don't "simplify" it away.
        sql`${watchProgress.positionSeconds} < ${clips.durationSeconds} * ${RESUME_MAX_FRACTION}::float8`
      )
    )
    .orderBy(desc(watchProgress.updatedAt))
    .limit(CONTINUE_LIMIT)

  return rows.filter(resumable).map(toContinueItem)
}

/** One joined `watch_progress` + `clips` row, as the select above shapes it. */
interface ProgressRow {
  id: string
  title: string
  creator: string
  thumbnailUrl: string
  videoUrl: string
  views: number
  durationSeconds: number
  positionSeconds: number
  completed: boolean
  avatarUrl: string | null
}

function resumable(row: ProgressRow): boolean {
  return isResumable(row.positionSeconds, row.durationSeconds, row.completed)
}

function toContinueItem(row: ProgressRow): ContinueWatchingItem {
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
    percent: progressPercent(row.positionSeconds, row.durationSeconds),
    remaining: formatRemaining(row.positionSeconds, row.durationSeconds),
    avatarUrl: row.avatarUrl
  }
}
