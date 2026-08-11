import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, playlistItems, playlists } from '../db/schema'
import { formatAge, formatDuration } from './format'
import { formatCount } from '#shared/utils/format'
import type {
  PlaylistDetail,
  PlaylistDraft,
  PlaylistItem,
  PlaylistMembership,
  PlaylistSummary
} from '#shared/types/library'

/** Cover thumbnails on a playlist card — matches the stack `PlaylistCard` draws. */
const COVER_COUNT = 3

/**
 * One row of the summary query, before formatting.
 *
 * A `type` alias, not an `interface`: `db.execute<T>()` constrains `T` to
 * `Record<string, unknown>`, and only type aliases carry the implicit index
 * signature that satisfies it (same as `FeedRow` in `home.ts`).
 */
type SummaryRow = {
  id: string
  title: string
  description: string | null
  visibility: PlaylistSummary['visibility']
  updated_at: Date
  item_count: number
  covers: string[] | null
}

/**
 * The card-level shape: counts and the first few thumbnails, without loading
 * every item of every playlist to get them.
 *
 * `array_agg(... order by position)` rather than a correlated subquery per
 * playlist — one pass over the join instead of one extra query per row. The
 * `array_remove` is what keeps an empty playlist honest: a `left join` with no
 * items aggregates to `{null}`, which would otherwise render as one broken
 * cover image.
 */
function summarySelect(where: ReturnType<typeof sql>) {
  return sql`
    select p.id,
           p.title,
           p.description,
           p.visibility::text as visibility,
           p.updated_at,
           count(pi.id)::int as item_count,
           (array_remove(array_agg(c.thumbnail_url order by pi.position asc), null))[1:${COVER_COUNT}] as covers
    from playlists p
    left join playlist_items pi on pi.playlist_id = p.id
    left join clips c on c.id = pi.clip_id
    where ${where}
    group by p.id
    order by p.updated_at desc
  `
}

function toSummary(row: SummaryRow): PlaylistSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    visibility: row.visibility,
    itemCount: row.item_count,
    covers: row.covers ?? [],
    updatedAt: `Updated ${formatAge(new Date(row.updated_at))}`
  }
}

/** Every playlist this viewer owns, most recently touched first. */
export async function selectPlaylists(userId: string): Promise<PlaylistSummary[]> {
  const rows = await db.execute<SummaryRow>(summarySelect(sql`p.user_id = ${userId}`))
  return [...rows].map(toSummary)
}

/**
 * One playlist and its clips.
 *
 * Authorization is part of the read, not a check the caller might forget: a
 * `private` playlist resolves only for its owner, and for anyone else this
 * returns `null` — the same answer as an id that doesn't exist, so a probe
 * can't tell a private playlist from a missing one.
 */
export async function selectPlaylist(
  id: string,
  userId: string | null
): Promise<PlaylistDetail | null> {
  const [row] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1)
  if (!row) return null

  const isOwner = !!userId && row.userId === userId
  if (!isOwner && row.visibility === 'private') return null

  const [summary] = [
    ...(await db.execute<SummaryRow>(summarySelect(sql`p.id = ${id}`)))
  ]
  if (!summary) return null

  return { ...toSummary(summary), isOwner, items: await selectPlaylistItems(id) }
}

async function selectPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const rows = await db
    .select({
      id: clips.id,
      title: clips.title,
      creator: clips.creator,
      thumbnailUrl: clips.thumbnailUrl,
      videoUrl: clips.videoUrl,
      views: clips.views,
      durationSeconds: clips.durationSeconds,
      createdAt: clips.createdAt,
      position: playlistItems.position
    })
    .from(playlistItems)
    .innerJoin(clips, eq(clips.id, playlistItems.clipId))
    .where(eq(playlistItems.playlistId, playlistId))
    .orderBy(playlistItems.position)

  return rows.map((row) => ({
    id: row.id,
    slug: row.id,
    kind: 'clip' as const,
    title: row.title,
    channel: row.creator,
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    meta: `${formatCount(row.views)} views · ${formatAge(row.createdAt)}`,
    duration: formatDuration(row.durationSeconds),
    position: row.position
  }))
}

export async function createPlaylist(
  userId: string,
  draft: PlaylistDraft
): Promise<PlaylistSummary> {
  const [row] = await db
    .insert(playlists)
    .values({
      id: crypto.randomUUID(),
      userId,
      title: draft.title,
      description: draft.description || null,
      visibility: draft.visibility ?? 'private'
    })
    .returning()

  return {
    id: row!.id,
    title: row!.title,
    description: row!.description ?? '',
    visibility: row!.visibility,
    itemCount: 0,
    covers: [],
    updatedAt: `Updated ${formatAge(row!.updatedAt)}`
  }
}

/**
 * Delete a playlist you own.
 *
 * Ownership is in the `where`, not in a read-then-delete: scoping the write
 * itself means there is no window between the check and the delete, and a
 * request for someone else's id simply affects no rows.
 */
export async function deletePlaylist(userId: string, id: string): Promise<boolean> {
  const removed = await db
    .delete(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
    .returning({ id: playlists.id })

  return removed.length > 0
}

/** Confirms the playlist exists *and* belongs to this user, for the item writes. */
async function ownsPlaylist(userId: string, playlistId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
    .limit(1)

  return !!row
}

/** Bump `updated_at` — "your playlists" is ordered by activity, not by rename. */
async function touch(playlistId: string): Promise<void> {
  await db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, playlistId))
}

/**
 * Append a clip.
 *
 * `onConflictDoNothing` on the `(playlist, clip)` unique index makes this
 * idempotent: adding a video that's already in the list is a no-op, not a
 * duplicate row and not an error the UI has to explain. The position is
 * `max + 1`, so existing rows are never renumbered.
 */
export async function addToPlaylist(
  userId: string,
  playlistId: string,
  clipId: string
): Promise<boolean> {
  if (!(await ownsPlaylist(userId, playlistId))) return false

  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId)).limit(1)
  if (!clip) return false

  await db
    .insert(playlistItems)
    .values({
      id: crypto.randomUUID(),
      playlistId,
      clipId,
      position: sql`(
        select coalesce(max(position), 0) + 1
        from playlist_items
        where playlist_id = ${playlistId}
      )`
    })
    .onConflictDoNothing({ target: [playlistItems.playlistId, playlistItems.clipId] })

  await touch(playlistId)
  return true
}

/** Remove a clip. Idempotent for the same reason `addToPlaylist` is. */
export async function removeFromPlaylist(
  userId: string,
  playlistId: string,
  clipId: string
): Promise<boolean> {
  if (!(await ownsPlaylist(userId, playlistId))) return false

  await db
    .delete(playlistItems)
    .where(and(eq(playlistItems.playlistId, playlistId), eq(playlistItems.clipId, clipId)))

  await touch(playlistId)
  return true
}

/**
 * Every playlist this viewer owns, flagged with whether it already holds this
 * clip — one query behind the "Save to playlist" menu's checkboxes.
 */
export async function selectMemberships(
  userId: string,
  clipId: string
): Promise<PlaylistMembership[]> {
  const rows = await db
    .select({
      id: playlists.id,
      title: playlists.title,
      visibility: playlists.visibility,
      contains: sql<boolean>`(${playlistItems.id} is not null)`
    })
    .from(playlists)
    .leftJoin(
      playlistItems,
      and(eq(playlistItems.playlistId, playlists.id), eq(playlistItems.clipId, clipId))
    )
    .where(eq(playlists.userId, userId))
    .orderBy(playlists.updatedAt)

  return rows.map((row) => ({ ...row, contains: !!row.contains }))
}
