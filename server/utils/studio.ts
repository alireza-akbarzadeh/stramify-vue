import { and, count, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, comments, reactions } from '../db/schema'
import { deleteObjectByUrl } from './storage'
import type { StudioVideo, StudioVideoPatch } from '#shared/types/studio'

/**
 * Creator Studio's half of the `clips` table: the rows one account owns, and
 * the writes it may make to them.
 *
 * Every function here takes `ownerId` first and folds it into the `where` of
 * the statement itself rather than fetching a row and checking it afterwards.
 * That isn't a style preference — an ownership test that happens after the
 * read is one a future call site can forget, while a `where` that doesn't
 * match simply affects zero rows.
 */

/**
 * The engagement counts the content table shows, as correlated subqueries.
 *
 * Not joins: joining `comments` and `reactions` at once multiplies rows and
 * needs a `group by` over every selected column to undo. For one creator's
 * uploads — a page, not a catalogue — two indexed lookups per row is both
 * simpler to read and cheaper to run.
 *
 * `comments.likes` is deliberately not summed in here the way the watch page
 * does; this column counts *reactions to the video*, and the seeded baseline
 * on individual comments is a different number about a different thing.
 */
const ENGAGEMENT = {
  comments: sql<number>`(select count(*) from ${comments} where ${comments.clipId} = ${clips.id})::int`,
  likes: sql<number>`(select count(*) from ${reactions} where ${reactions.targetId} = ${clips.id} and ${reactions.targetKind} = 'clip' and ${reactions.value} = 'like')::int`
}

type StudioRow = typeof clips.$inferSelect & { comments: number; likes: number }

export function toStudioVideo(row: StudioRow): StudioVideo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    visibility: row.visibility,
    orientation: row.orientation,
    thumbnailUrl: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    durationSeconds: row.durationSeconds,
    views: row.views,
    comments: row.comments,
    likes: row.likes,
    // ISO rather than a formatted age: the table sorts on this column, and a
    // sort on "3 days ago" is a sort on the letter `3`.
    createdAt: row.createdAt.toISOString()
  }
}

/**
 * Everything this account has uploaded, newest first.
 *
 * No visibility filter, on purpose: this is the one surface in the app where a
 * creator's private drafts are exactly what they came to see.
 */
export async function listStudioVideos(ownerId: string): Promise<StudioVideo[]> {
  const rows = await db
    .select({ ...getTableColumns(clips), ...ENGAGEMENT })
    .from(clips)
    .where(eq(clips.ownerId, ownerId))
    .orderBy(desc(clips.createdAt))

  return rows.map(toStudioVideo)
}

/** One of this account's uploads, or `null` — including when it belongs to someone else. */
export async function readStudioVideo(ownerId: string, id: string): Promise<StudioVideo | null> {
  const [row] = await db
    .select({ ...getTableColumns(clips), ...ENGAGEMENT })
    .from(clips)
    .where(and(eq(clips.id, id), eq(clips.ownerId, ownerId)))
    .limit(1)

  return row ? toStudioVideo(row) : null
}

/**
 * Apply an edit. `null` when the id isn't this account's — the caller turns
 * that into a 404, matching how playlists answer for someone else's row: the
 * caller has no business learning the id exists.
 *
 * An empty `description` becomes `null` rather than `''`, so "I cleared this"
 * and "I never wrote one" land on the same value and the watch page's "No
 * description provided" covers both.
 */
export async function updateStudioVideo(
  ownerId: string,
  id: string,
  patch: StudioVideoPatch
): Promise<StudioVideo | null> {
  const changes = {
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.description !== undefined && { description: patch.description || null }),
    ...(patch.category !== undefined && { category: patch.category }),
    ...(patch.visibility !== undefined && { visibility: patch.visibility })
  }

  // A patch with no recognised field is a read, not an error — the form sends
  // only what changed, and "nothing changed" is a thing forms do.
  if (Object.keys(changes).length === 0) return readStudioVideo(ownerId, id)

  const [row] = await db
    .update(clips)
    .set(changes)
    .where(and(eq(clips.id, id), eq(clips.ownerId, ownerId)))
    .returning({ id: clips.id })

  return row ? readStudioVideo(ownerId, id) : null
}

/**
 * Delete an upload and the bytes behind it.
 *
 * The row goes first. If the object delete then fails the result is an
 * orphaned file — invisible, costing disk. The other order risks a row whose
 * video 404s, which is a broken page for anyone holding the link. One of the
 * two has to be tolerated, and it should be the one nobody can see.
 *
 * Comments, reactions, playlist entries, watch history and watch-later rows
 * all cascade from `clips.id` in the schema, so they go with it.
 */
export async function deleteStudioVideo(ownerId: string, id: string): Promise<boolean> {
  const [row] = await db
    .delete(clips)
    .where(and(eq(clips.id, id), eq(clips.ownerId, ownerId)))
    .returning({ videoUrl: clips.videoUrl, thumbnailUrl: clips.thumbnailUrl })

  if (!row) return false

  // Seeded rows point at external URLs; `deleteObjectByUrl` recognises those
  // as not ours and does nothing, which is why this needs no extra test.
  await Promise.all([deleteObjectByUrl(row.videoUrl), deleteObjectByUrl(row.thumbnailUrl)])
  return true
}

/**
 * How many uploads this account has.
 *
 * Read by the content page to tell its two empty states apart: "you haven't
 * uploaded anything yet" wants the uploader, "nothing matches this filter"
 * wants the filter cleared, and showing either one in place of the other is
 * the kind of dead end that makes a page feel broken.
 */
export async function countStudioVideos(ownerId: string): Promise<number> {
  const [row] = await db
    .select({ total: count(clips.id) })
    .from(clips)
    .where(eq(clips.ownerId, ownerId))
  return row?.total ?? 0
}
