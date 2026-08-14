import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { channels, clips, reactions } from '../db/schema'
import { toLikePattern } from './search'
import { formatCount } from '#shared/utils/format'
import type { LikedItem, LikedPage, LikedSort } from '#shared/types/library'

/**
 * `/liked` — every clip this viewer gave a thumbs up, as a searchable library.
 *
 * There is no `liked` table: a like *is* a `reactions` row with `value =
 * 'like'`, the same row the watch page's thumbs-up writes. Reading it back is
 * what makes this page honest — like something on `/watch`, and it is here on
 * the next load, with no second write to keep in sync.
 *
 * The read is deliberately the same shape as `selectHistory` and
 * `selectWatchLater`: same join to `clips` for the card's copy, same left join
 * to `channels` for the avatar, same "inner join means a deleted clip drops out
 * rather than rendering a row with a broken thumbnail". What differs is the
 * table it starts from, what it orders by, and the `target_kind` filter.
 */

interface LikedQuery {
  userId: string
  /** Row offset. Offset paging, same as `/history` — see `selectHistory`. */
  cursor: number
  limit: number
  /** Free-text filter over title and channel. Empty string means unfiltered. */
  search: string
  sort: LikedSort
}

export async function selectLiked({
  userId,
  cursor,
  limit,
  search,
  sort
}: LikedQuery): Promise<LikedPage> {
  const rows = await db
    .select({
      id: clips.id,
      title: clips.title,
      creator: clips.creator,
      thumbnailUrl: clips.thumbnailUrl,
      videoUrl: clips.videoUrl,
      views: clips.views,
      durationSeconds: clips.durationSeconds,
      likedAt: reactions.createdAt,
      avatarUrl: channels.avatarUrl
    })
    .from(reactions)
    // `target_id` is a plain text id, not a foreign key (ADR-014), so this join
    // is also what enforces "clips only" — a live session's id can't match a
    // `clips.id`. The explicit `target_kind` filter below says so out loud and
    // keeps the planner from probing `clips` for rows that can't be there.
    .innerJoin(clips, eq(clips.id, reactions.targetId))
    .leftJoin(channels, eq(channels.handle, sql`lower(${clips.creator})`))
    .where(
      and(
        eq(reactions.userId, userId),
        eq(reactions.value, 'like'),
        eq(reactions.targetKind, 'clip'),
        searchFilter(search)
      )
    )
    .orderBy(...orderFor(sort))
    // One extra row purely to answer "is there a next page" without a second
    // count query. It's sliced off before the payload is built — same trick as
    // `selectHistory`.
    .limit(limit + 1)
    .offset(cursor)

  const hasMore = rows.length > limit
  return {
    items: rows.slice(0, limit).map(toLikedItem),
    nextCursor: hasMore ? cursor + limit : null
  }
}

/**
 * The `ORDER BY`, per the viewer's choice.
 *
 * `recent` and `oldest` are a single key on purpose: that's `reactions_user_
 * created_idx` exactly, so paging is an index scan rather than a sort over
 * every like the viewer has left. `popular` can't use an index whatever we do —
 * it orders by a column on the *joined* table — so it can afford the recency
 * tiebreak that keeps two equally-viewed clips in a stable order across pages.
 */
function orderFor(sort: LikedSort) {
  if (sort === 'oldest') return [asc(reactions.createdAt)]
  if (sort === 'popular') return [desc(clips.views), desc(reactions.createdAt)]
  return [desc(reactions.createdAt)]
}

/**
 * Title-or-channel contains, case-insensitively. `undefined` when there's no
 * term, which `and()` drops — a `%%` LIKE would match every row but force a
 * scan to prove it.
 *
 * Escaping is `toLikePattern`'s job rather than this file's: `%` and `_` mean
 * something to Postgres and channel handles are full of underscores, and that
 * rule shouldn't be written down once per surface that searches.
 */
function searchFilter(search: string) {
  const term = search.trim()
  if (!term) return undefined

  const pattern = toLikePattern(term)
  return or(ilike(clips.title, pattern), ilike(clips.creator, pattern))
}

/**
 * Like a clip — *set*, not toggle.
 *
 * `POST /api/watch/[slug]/reaction` already exists and is what the watch page's
 * thumbs-up calls, but that one flips: pressing it on something already liked
 * clears it. That's right under a button whose job is to express both answers,
 * and wrong for "undo the removal I just did", where the caller knows the
 * outcome it wants. So: an upsert on the unique `(user_id, target_id)` pair,
 * which lands on `like` whether the viewer had nothing, a like, or a dislike.
 *
 * Returns `false` for a clip that doesn't exist, which the endpoint turns into
 * a 404 — same contract as `addToWatchLater`.
 */
export async function addLike(userId: string, clipId: string): Promise<boolean> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId)).limit(1)
  if (!clip) return false

  await db
    .insert(reactions)
    .values({
      id: `reaction-${crypto.randomUUID()}`,
      userId,
      targetId: clipId,
      targetKind: 'clip',
      value: 'like'
    })
    .onConflictDoUpdate({
      target: [reactions.userId, reactions.targetId],
      set: { value: 'like' }
    })

  return true
}

/**
 * Take a like back.
 *
 * Scoped to `value = 'like'` as well as to the user and the clip, so an unlike
 * racing a change of mind on the watch page can only ever remove a like — never
 * silently clear a dislike the viewer left in the meantime.
 *
 * Ownership lives in the `where` rather than in a read-then-delete, the same
 * way `removeFromWatchLater` does it: no window between the check and the
 * write, and a request naming someone else's row simply affects nothing.
 */
export async function removeLike(userId: string, clipId: string): Promise<void> {
  await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.userId, userId),
        eq(reactions.targetId, clipId),
        eq(reactions.value, 'like')
      )
    )
}

/** One joined `reactions` + `clips` row, as the select above shapes it. */
interface LikedRow {
  id: string
  title: string
  creator: string
  thumbnailUrl: string
  videoUrl: string
  views: number
  durationSeconds: number
  likedAt: Date
  avatarUrl: string | null
}

function toLikedItem(row: LikedRow): LikedItem {
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
    likedAt: row.likedAt.toISOString(),
    avatarUrl: row.avatarUrl
  }
}
