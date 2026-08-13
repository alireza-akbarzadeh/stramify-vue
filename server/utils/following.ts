import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { publishedClipsSql } from './discovery'
import { notSuppressed } from './feedback'
import { toHomeVideo } from './home'
import type { FeedRow } from './home'
import { toChannelDisplayName, toChannelHandle } from '#shared/utils/channel'
import { FOLLOWING_SHELF_LIMIT, FOLLOWING_SHELF_SIZE } from '#shared/types/following'
import type { FollowingShelf } from '#shared/types/following'

/**
 * The videos half of `/following` — a shelf per followed channel.
 *
 * The channel half (identity, stats, bell) is `listFollowedChannels` in
 * `utils/channels.ts`, which reuses the directory's aggregate query. This file
 * is the part that has no equivalent there: a per-channel window over `clips`.
 */

/**
 * One video, plus the three things its shelf header needs. Extends the home
 * feed's row so `toHomeVideo` can map it unchanged rather than growing a
 * second, drift-prone copy of the same formatting.
 */
type ShelfRow = Omit<FeedRow, 'followed'> & {
  /** Total landscape clips this channel has, and the order shelves appear in. */
  channel_total: number
  display_name: string | null
  verified: boolean
  is_live: boolean
}

/**
 * Latest uploads from the channels this viewer follows, grouped by channel.
 *
 * Clips only, no live sessions. A shelf's "See all" opens the channel page's
 * Videos tab, which is landscape clips (`readChannelVideos`), so counting
 * anything else here would put a number on screen that the destination
 * contradicts. A channel being on air is surfaced by the story ring and the
 * shelf's Live pill instead.
 *
 * Ordered by how much a channel has published, per the page's brief. That's
 * measured *after* feed feedback is applied, so a channel you've hidden most
 * of doesn't outrank one you actually watch.
 *
 * All the cutting happens in the database: `channel_totals` picks the shelves
 * before the window function runs, so the work is bounded by
 * `FOLLOWING_SHELF_LIMIT × FOLLOWING_SHELF_SIZE` rows however much the viewer
 * follows.
 */
export async function listFollowingShelves(userId: string | null): Promise<FollowingShelf[]> {
  if (!userId) return []

  const rows = await db.execute<ShelfRow>(sql`
    with my_follows as (
      select lower(channel) as handle
      from follows
      where user_id = ${userId}
    ),
    cands as (
      select c.id,
             c.id as slug,
             'clip' as kind,
             c.title,
             c.creator as channel,
             c.category::text as category,
             c.thumbnail_url as image,
             c.video_url,
             c.views as audience,
             c.created_at as published_at,
             c.duration_seconds
      from clips c
      join my_follows mf on mf.handle = lower(c.creator)
      -- Shorts have their own full-screen feed; a 9:16 video in a 16:9 card is
      -- two black bars. Same rule as CANDIDATES in utils/home.ts.
      where c.orientation = 'landscape' and ${publishedClipsSql}
    ),
    -- Aliased \`cand\` because that is the relation name notSuppressed() is
    -- written against (it reads cand.id and cand.channel).
    visible as (
      select cand.* from cands cand where ${notSuppressed(userId)}
    ),
    channel_totals as (
      select lower(channel) as handle, count(*)::int as total
      from visible
      group by 1
      order by total desc, handle asc
      limit ${FOLLOWING_SHELF_LIMIT}
    ),
    ranked as (
      select v.*,
             ct.total as channel_total,
             row_number() over (
               partition by ct.handle
               order by v.published_at desc, v.id asc
             ) as rn
      from visible v
      join channel_totals ct on ct.handle = lower(v.channel)
    ),
    live_now as (
      select distinct lower(streamer_name) as handle from live_streams
    )
    select r.id,
           r.slug,
           r.kind,
           r.title,
           r.channel,
           r.category,
           r.image,
           r.video_url,
           r.audience,
           r.published_at,
           r.duration_seconds,
           r.channel_total,
           ch.avatar_url,
           ch.display_name,
           coalesce(ch.verified, false) as verified,
           (ln.handle is not null) as is_live
    from ranked r
    left join channels ch on ch.handle = lower(r.channel)
    left join live_now ln on ln.handle = lower(r.channel)
    where r.rn <= ${FOLLOWING_SHELF_SIZE}
    order by r.channel_total desc, lower(r.channel) asc, r.rn asc
  `)

  return groupByChannel([...rows])
}

/**
 * Rows → shelves, preserving the order the query returned.
 *
 * A `Map` rather than a sort afterwards: the SQL already ordered by channel
 * total and then by recency within each channel, and insertion order is the
 * one thing a `Map` guarantees. Re-sorting here would mean writing the ranking
 * down twice.
 */
function groupByChannel(rows: ShelfRow[]): FollowingShelf[] {
  const shelves = new Map<string, FollowingShelf>()

  for (const row of rows) {
    const handle = toChannelHandle(row.channel)
    let shelf = shelves.get(handle)

    if (!shelf) {
      shelf = {
        channel: {
          handle,
          name: row.display_name ?? toChannelDisplayName(row.channel),
          avatarUrl: row.avatar_url,
          verified: row.verified,
          clipCount: row.channel_total,
          isLive: row.is_live
        },
        videos: []
      }
      shelves.set(handle, shelf)
    }

    // `followed: false` on purpose. Every card on this page is from a channel
    // you follow, so a "Following" line under all of them is noise; leaving the
    // flag off lets the reason fall through to "New upload" or to nothing,
    // which is the only part still worth saying here.
    shelf.videos.push(toHomeVideo({ ...row, followed: false }))
  }

  return [...shelves.values()]
}
