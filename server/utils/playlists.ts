import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, playlistItems, playlists } from '../db/schema'
import { formatAge, formatDuration } from './format'
import { formatCount } from '#shared/utils/format'
import type {
  PlaylistDetail,
  PlaylistDraft,
  PlaylistItem,
  PlaylistMembership,
  PlaylistMove,
  PlaylistPatch,
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
 * Rename a playlist, rewrite its description, or change who can see it.
 *
 * Ownership is in the `where` for the same reason it is in `deletePlaylist` —
 * one statement, no check-then-act window, and someone else's id affects no
 * rows. The summary is re-read afterwards rather than assembled from the
 * `returning()` row, because the card this feeds also shows the item count and
 * the cover stack, and neither lives on `playlists`.
 *
 * An empty description clears the column: the edit form sends `''` when the
 * field is emptied, and storing that would render as a blank paragraph rather
 * than as "no description".
 */
export async function updatePlaylist(
  userId: string,
  id: string,
  patch: PlaylistPatch
): Promise<PlaylistSummary | null> {
  const [row] = await db
    .update(playlists)
    .set({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description || null }),
      ...(patch.visibility !== undefined && { visibility: patch.visibility }),
      updatedAt: new Date()
    })
    .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
    .returning({ id: playlists.id })

  if (!row) return null

  const [summary] = [...(await db.execute<SummaryRow>(summarySelect(sql`p.id = ${id}`)))]
  return summary ? toSummary(summary) : null
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
 * Move a clip one slot up or down its playlist.
 *
 * Swaps the two rows' `position` values rather than renumbering the list. That
 * keeps the sparse-position invariant `playlist_items` is built on (see the
 * schema): a swap is two updates whatever the list's length, where "move to
 * index N" would rewrite every row below the move. There is no unique index on
 * `(playlist_id, position)`, so the pair can cross without an intermediate
 * value, and the transaction is what stops a crash between the two statements
 * leaving both rows on the same position.
 *
 * An item already at the end it's moving towards returns `true` with no write:
 * that's the state the caller asked for, and the arrow it pressed is disabled
 * in the UI anyway.
 */
export async function movePlaylistItem(
  userId: string,
  playlistId: string,
  clipId: string,
  direction: PlaylistMove
): Promise<boolean> {
  if (!(await ownsPlaylist(userId, playlistId))) return false

  const [item] = await db
    .select({ id: playlistItems.id, position: playlistItems.position })
    .from(playlistItems)
    .where(and(eq(playlistItems.playlistId, playlistId), eq(playlistItems.clipId, clipId)))
    .limit(1)

  if (!item) return false

  const up = direction === 'up'
  const [neighbour] = await db
    .select({ id: playlistItems.id, position: playlistItems.position })
    .from(playlistItems)
    .where(
      and(
        eq(playlistItems.playlistId, playlistId),
        up
          ? lt(playlistItems.position, item.position)
          : gt(playlistItems.position, item.position)
      )
    )
    .orderBy(up ? desc(playlistItems.position) : asc(playlistItems.position))
    .limit(1)

  if (!neighbour) return true

  await db.transaction(async (tx) => {
    await tx
      .update(playlistItems)
      .set({ position: neighbour.position })
      .where(eq(playlistItems.id, item.id))
    await tx
      .update(playlistItems)
      .set({ position: item.position })
      .where(eq(playlistItems.id, neighbour.id))
  })

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
