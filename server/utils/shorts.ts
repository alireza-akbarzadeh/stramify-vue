import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { publishedClipsSql } from './discovery'
import { formatAge } from './format'
import { formatCount } from '#shared/utils/format'
import { SHORTS_PAGE_SIZE } from '#shared/types/shorts'
import type { Short, ShortsPage } from '#shared/types/shorts'
import type { ClipCategory } from '#shared/types/discovery'
import type { ReactionValue } from '#shared/types/watch'

/** One joined row of the query below. Column names are snake_case — it's raw SQL. */
type ShortRow = {
  id: string
  title: string
  creator: string
  category: ClipCategory
  description: string | null
  video_url: string
  thumbnail_url: string
  views: number
  created_at: Date
  avatar_url: string | null
  likes: number
  dislikes: number
  comment_count: number
  my_reaction: ReactionValue | null
  is_following: boolean
}

/**
 * Like/dislike totals per clip, counted from `reactions` rather than stored on
 * the row — same rule as the home feed, no counter to drift out of sync.
 */
const REACTION_STATS = sql`
  select target_id,
         count(*) filter (where value = 'like')::int as likes,
         count(*) filter (where value = 'dislike')::int as dislikes
  from reactions
  where target_kind = 'clip'
  group by target_id
`

/** How many comments the rail's badge shows. Replies count too — they're comments. */
const COMMENT_STATS = sql`
  select clip_id, count(*)::int as total from comments group by clip_id
`

/**
 * Per-viewer state, or nothing at all when signed out.
 *
 * `where false` rather than skipping the join: the query shape stays identical
 * for both cases, so there is one plan to reason about and `my_reaction` comes
 * back `null` for an anonymous viewer without a second code path.
 */
function myReactions(userId: string | null) {
  return sql`
    select target_id, value::text as value
    from reactions
    where ${userId ? sql`user_id = ${userId} and target_kind = 'clip'` : sql`false`}
  `
}

function myFollows(userId: string | null) {
  return sql`
    select lower(channel) as handle
    from follows
    where ${userId ? sql`user_id = ${userId}` : sql`false`}
  `
}

function toShort(row: ShortRow): Short {
  return {
    id: row.id,
    title: row.title,
    channel: row.creator,
    avatarUrl: row.avatar_url,
    category: row.category,
    description: row.description ?? '',
    videoUrl: row.video_url,
    posterUrl: row.thumbnail_url,
    views: `${formatCount(row.views)} views`,
    publishedAt: formatAge(new Date(row.created_at)),
    likes: row.likes,
    dislikes: row.dislikes,
    myReaction: row.my_reaction,
    commentCount: row.comment_count,
    isFollowing: row.is_following
  }
}

export interface ShortsPageOptions {
  /** Offset of the first row to return; `0` is the first page. */
  cursor?: number
  limit?: number
  /**
   * A shared link's short (`/shorts?v=<id>`), pinned to the very front of the
   * feed so the page opens on the video the link promised instead of scrolling
   * to find it. Pinning is part of the ordering rather than a client-side
   * splice, so it survives paging: the pinned row is index 0 of the whole feed,
   * never index 0 of page 2 as well.
   */
  startId?: string | null
  /** Signed-in viewer, so their reactions and follows come back with the page. */
  userId?: string | null
}

/**
 * One page of the vertical feed, with each short's engagement state already
 * joined on.
 *
 * Everything the overlay renders arrives in this single query — likes, the
 * viewer's own reaction, comment count, follow state, channel avatar — because
 * the alternative is four extra round trips per slide, and a feed scrolls.
 *
 * Ordered newest-first with `id` breaking ties, which makes offset paging
 * deterministic: the same cursor returns the same rows as long as nothing is
 * published mid-scroll.
 */
export async function selectShortsPage(options: ShortsPageOptions = {}): Promise<ShortsPage> {
  const { cursor = 0, limit = SHORTS_PAGE_SIZE, startId = null, userId = null } = options

  // One row past the page, so "is there more" is answered without a count(*).
  const rows = await db.execute<ShortRow>(sql`
    with reaction_stats as (${REACTION_STATS}),
         comment_stats as (${COMMENT_STATS}),
         my_reactions as (${myReactions(userId)}),
         my_follows as (${myFollows(userId)})
    select c.id,
           c.title,
           c.creator,
           c.category::text as category,
           c.description,
           c.video_url,
           c.thumbnail_url,
           c.views,
           c.created_at,
           ch.avatar_url,
           coalesce(rx.likes, 0) as likes,
           coalesce(rx.dislikes, 0) as dislikes,
           coalesce(cs.total, 0) as comment_count,
           mr.value as my_reaction,
           (mf.handle is not null) as is_following
    from clips c
    left join reaction_stats rx on rx.target_id = c.id
    left join comment_stats cs on cs.clip_id = c.id
    left join my_reactions mr on mr.target_id = c.id
    left join my_follows mf on mf.handle = lower(c.creator)
    left join channels ch on ch.handle = lower(c.creator)
    where c.orientation = 'vertical' and ${publishedClipsSql}
    order by ${startId ? sql`(c.id = ${startId}) desc,` : sql``}
             c.created_at desc,
             c.id asc
    limit ${limit + 1} offset ${cursor}
  `)

  const page = [...rows]
  const hasMore = page.length > limit

  return {
    items: page.slice(0, limit).map(toShort),
    nextCursor: hasMore ? cursor + limit : null
  }
}
