import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { channels, clips, watchLater } from '../db/schema'
import { formatDuration } from './format'
import { formatCount } from '#shared/utils/format'
import type { WatchLaterItem } from '#shared/types/library'

/**
 * The Watch later queue — clips this viewer saved to come back to.
 *
 * The read is deliberately the same shape as `selectHistory`: same join to
 * `clips` for the card's copy, same left join to `channels` for the avatar,
 * same "inner join means a deleted clip drops out rather than rendering a row
 * with a broken thumbnail". What differs is only the table it starts from and
 * what it orders by — saves are ordered by when you saved, not by when you
 * watched. See `server/db/schema/watch-later.ts` for why this isn't a playlist.
 */

/** Most recently saved first, capped by the caller. */
export async function selectWatchLater(userId: string, limit: number): Promise<WatchLaterItem[]> {
  const rows = await db
    .select({
      id: clips.id,
      title: clips.title,
      creator: clips.creator,
      thumbnailUrl: clips.thumbnailUrl,
      videoUrl: clips.videoUrl,
      views: clips.views,
      durationSeconds: clips.durationSeconds,
      addedAt: watchLater.addedAt,
      avatarUrl: channels.avatarUrl
    })
    .from(watchLater)
    // Inner join, so a clip deleted since it was saved drops out of the queue
    // rather than rendering a row with no title. The FK cascades anyway; this
    // is the belt to that braces — same reasoning as `selectHistory`.
    .innerJoin(clips, eq(clips.id, watchLater.clipId))
    .leftJoin(channels, eq(channels.handle, sql`lower(${clips.creator})`))
    .where(eq(watchLater.userId, userId))
    // Matches `watch_later_user_added_idx`, so this is an index scan rather
    // than a sort over everything the viewer ever saved.
    .orderBy(desc(watchLater.addedAt))
    .limit(limit)

  return rows.map(toWatchLaterItem)
}

/**
 * Save a clip.
 *
 * `onConflictDoNothing` on the `(user, clip)` unique index makes this
 * idempotent, exactly like `addToPlaylist`: saving something already saved is
 * the state the caller asked for, not a duplicate row and not an error the menu
 * has to explain. It also keeps the *original* save time, so re-saving doesn't
 * quietly jump an old item to the front of the queue.
 *
 * Returns `false` for a clip that doesn't exist, which the endpoint turns into
 * a 404 — without this check a bad id would fail as a foreign key violation, a
 * 500 for what is really a bad request.
 */
export async function addToWatchLater(userId: string, clipId: string): Promise<boolean> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId)).limit(1)
  if (!clip) return false

  await db
    .insert(watchLater)
    .values({ id: crypto.randomUUID(), userId, clipId })
    .onConflictDoNothing({ target: [watchLater.userId, watchLater.clipId] })

  return true
}

/**
 * Unsave a clip.
 *
 * Ownership is in the `where` rather than in a read-then-delete, the same way
 * `deletePlaylist` does it: there is no window between the check and the write,
 * and a request naming someone else's row simply affects nothing. Idempotent
 * for the same reason the add is — the card is removed optimistically, so a
 * repeat press must not surface an error for the outcome already on screen.
 */
export async function removeFromWatchLater(userId: string, clipId: string): Promise<void> {
  await db
    .delete(watchLater)
    .where(and(eq(watchLater.userId, userId), eq(watchLater.clipId, clipId)))
}

/** One joined `watch_later` + `clips` row, as the select above shapes it. */
interface WatchLaterRow {
  id: string
  title: string
  creator: string
  thumbnailUrl: string
  videoUrl: string
  views: number
  durationSeconds: number
  addedAt: Date
  avatarUrl: string | null
}

function toWatchLaterItem(row: WatchLaterRow): WatchLaterItem {
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
    addedAt: row.addedAt.toISOString(),
    avatarUrl: row.avatarUrl
  }
}
