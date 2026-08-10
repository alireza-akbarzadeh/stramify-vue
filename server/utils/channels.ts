import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, follows, liveStreams } from '../db/schema'
import {  formatUptime } from './format'
import { toClip } from './discovery'
import { toChannelDisplayName, toChannelHandle } from '#shared/utils/channel'
import type { Clip, ClipCategory } from '#shared/types/discovery'
import type {
  ChannelListItem,
  ChannelProfile,
  ChannelSort,
  ChannelVideoSort
} from '#shared/types/channel'
import type { ChannelSummary } from '#shared/types/watch'

/**
 * Channel header data for the watch page — the follow button and its count.
 * Deliberately narrower than `readChannelProfile`: this one is fetched on every
 * watch page and re-fetched after every follow toggle, so it stays three cheap
 * counts. Identity is matched case-insensitively so `/watch/viper_squadron` and
 * `/watch/Viper_Squadron` agree on who they mean.
 */
export async function readChannelSummary(
  name: string,
  userId: string | null
): Promise<ChannelSummary> {
  const lower = sql`lower(${follows.channel})`
  const [followers, clipCount, mine] = await Promise.all([
    db
      .select({ total: count(follows.id) })
      .from(follows)
      .where(sql`${lower} = lower(${name})`),
    db
      .select({ total: count(clips.id) })
      .from(clips)
      .where(sql`lower(${clips.creator}) = lower(${name})`),
    userId
      ? db
          .select({ notify: follows.notify })
          .from(follows)
          .where(and(eq(follows.userId, userId), sql`${lower} = lower(${name})`))
          .limit(1)
      : Promise.resolve([])
  ])

  return {
    name,
    followers: formatCount(followers[0]?.total ?? 0),
    clipCount: clipCount[0]?.total ?? 0,
    isFollowing: mine.length > 0,
    // No follow row means no bell — `none` rather than the column default, so
    // the client never renders a lit bell for a channel you don't follow.
    notify: mine[0]?.notify ?? 'none'
  }
}

/**
 * The "top channels" score, written down instead of tuned by feel.
 *
 * Both signals are logged before they're added so one runaway number can't own
 * the whole ranking — a channel with ten times the views of another is ahead of
 * it, not ten places ahead. Followers are weighted double because following is
 * a deliberate act and a view is not, and a channel that is live right now gets
 * a fixed nudge so the directory's front page has something happening on it.
 * No engagement data beyond this exists yet; anything more would be invented.
 */
const RANK_SCORE = sql`
  (ln(1 + coalesce(fs.followers, 0)) * 2)
  + ln(1 + coalesce(cs.total_views, 0))
  + (case when coalesce(ls.live_count, 0) > 0 then 1.5 else 0 end)
`

/** Ordering per sort key. Chosen from this map, never built from user input. */
const ORDER_BY: Record<ChannelSort, SQL> = {
  top: sql`${RANK_SCORE} desc, coalesce(fs.followers, 0) desc`,
  followers: sql`coalesce(fs.followers, 0) desc, coalesce(cs.total_views, 0) desc`,
  views: sql`coalesce(cs.total_views, 0) desc, coalesce(fs.followers, 0) desc`,
  live: sql`(coalesce(ls.live_count, 0) > 0) desc, coalesce(ls.live_viewers, 0) desc, ${RANK_SCORE} desc`,
  new: sql`coalesce(c.created_at, cs.first_published) desc nulls last`
}

/**
 * One aggregated channel, straight off the CTE below. Every count is computed
 * from the rows that back it, so there is no stored counter to drift.
 */
type ChannelRow = {
  handle: string
  display_name: string | null
  tagline: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  website_url: string | null
  location: string | null
  verified: boolean
  joined_at: Date | null
  followers: number
  total_views: number
  clip_count: number
  live_count: number
  live_title: string | null
  top_thumbnail: string | null
  categories: string[] | null
  label: string | null
  is_following: boolean
}

/**
 * Every channel in the system with its derived stats.
 *
 * "Every channel" is the union of three sources, because a channel exists as
 * soon as it has *anything*: a row in `channels` (identity written, maybe no
 * uploads yet), a clip, or a live session. Aggregating in one statement rather
 * than in JS keeps sorting and `limit` in the database, which is the only way
 * the directory stays a single page of work as the table grows.
 */
function selectChannelRows(options: {
  handle?: string
  search?: string
  category?: ClipCategory
  sort?: ChannelSort
  limit?: number
  /** Signed-in viewer, so each row can carry its own follow state. */
  userId?: string | null
}) {
  const { handle, search, category, sort = 'top', limit = 60, userId = null } = options

  return db.execute<ChannelRow>(sql`
    with clip_stats as (
      select lower(creator) as handle,
             max(creator) as label,
             count(*)::int as clip_count,
             coalesce(sum(views), 0)::int as total_views,
             min(created_at) as first_published,
             (array_agg(thumbnail_url order by views desc))[1] as top_thumbnail
      from clips
      group by lower(creator)
    ),
    live_stats as (
      select lower(streamer_name) as handle,
             max(streamer_name) as label,
             count(*)::int as live_count,
             coalesce(sum(viewer_count), 0)::int as live_viewers,
             (array_agg(title order by viewer_count desc))[1] as live_title
      from live_streams
      group by lower(streamer_name)
    ),
    follow_stats as (
      select lower(channel) as handle, count(*)::int as followers
      from follows
      group by lower(channel)
    ),
    my_follows as (
      select lower(channel) as handle
      from follows
      where ${userId ? sql`user_id = ${userId}` : sql`false`}
    ),
    category_stats as (
      select handle, array_agg(category order by n desc, category) as categories
      from (
        select handle, category, sum(n)::int as n
        from (
          select lower(creator) as handle, category::text as category, count(*)::int as n
          from clips group by 1, 2
          union all
          select lower(streamer_name) as handle, category::text as category, count(*)::int as n
          from live_streams group by 1, 2
        ) per_source
        group by handle, category
      ) merged
      group by handle
    ),
    all_handles as (
      select handle from clip_stats
      union select handle from live_stats
      union select handle from channels
    )
    select h.handle,
           c.display_name,
           c.tagline,
           c.bio,
           c.avatar_url,
           c.banner_url,
           c.website_url,
           c.location,
           coalesce(c.verified, false) as verified,
           coalesce(c.created_at, cs.first_published) as joined_at,
           coalesce(fs.followers, 0) as followers,
           coalesce(cs.total_views, 0) as total_views,
           coalesce(cs.clip_count, 0) as clip_count,
           coalesce(ls.live_count, 0) as live_count,
           ls.live_title,
           cs.top_thumbnail,
           cats.categories,
           coalesce(cs.label, ls.label) as label,
           (mf.handle is not null) as is_following
    from all_handles h
    left join channels c on c.handle = h.handle
    left join clip_stats cs on cs.handle = h.handle
    left join live_stats ls on ls.handle = h.handle
    left join follow_stats fs on fs.handle = h.handle
    left join category_stats cats on cats.handle = h.handle
    left join my_follows mf on mf.handle = h.handle
    where ${handle ? sql`h.handle = ${handle}` : sql`true`}
      and ${
        search
          ? sql`(h.handle ilike ${`%${search}%`} or coalesce(c.display_name, '') ilike ${`%${search}%`})`
          : sql`true`
      }
      and ${
        // Cast the bound parameter: `cats.categories` is `text[]`, and an
        // untyped parameter on the left of `= any(...)` can't be inferred.
        category ? sql`${category}::text = any(cats.categories)` : sql`true`
      }
    order by ${ORDER_BY[sort]}
    limit ${limit}
  `)
}

function toCategories(raw: string[] | null): ClipCategory[] {
  return (raw ?? []) as ClipCategory[]
}

/** Display name: the channel's own, else the creator's casing, else the handle. */
function toDisplayName(row: ChannelRow): string {
  return row.display_name ?? toChannelDisplayName(row.label ?? row.handle)
}

function toListItem(row: ChannelRow): ChannelListItem {
  return {
    handle: row.handle,
    name: toDisplayName(row),
    tagline: row.tagline ?? '',
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    verified: row.verified,
    followerCount: row.followers,
    totalViews: formatCount(row.total_views),
    clipCount: row.clip_count,
    categories: toCategories(row.categories),
    isLive: row.live_count > 0,
    liveTitle: row.live_title,
    previewImage: row.banner_url ?? row.top_thumbnail,
    isFollowing: row.is_following
  }
}

/** `Date` → `"Mar 2026"`. Null dates only happen for a channel with no history. */
function formatJoined(value: Date | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** The ranked channel directory behind `/channels`. */
export async function listChannels(options: {
  search?: string
  category?: ClipCategory
  sort?: ChannelSort
  limit?: number
  userId?: string | null
}): Promise<ChannelListItem[]> {
  const rows = await selectChannelRows(options)
  return [...rows].map(toListItem)
}

/**
 * Full channel page header. Returns `null` for a handle nothing is published
 * under, so the route can 404 instead of rendering an empty shell.
 */
export async function readChannelProfile(
  name: string,
  userId: string | null
): Promise<ChannelProfile | null> {
  const handle = toChannelHandle(name)
  const [rows, live] = await Promise.all([
    selectChannelRows({ handle, limit: 1, userId }),
    // Equality on `lower(...)`, not `ilike` — handles contain underscores
    // (`Canvas_Queen`) and `_` is a single-character wildcard in LIKE.
    db
      .select()
      .from(liveStreams)
      .where(sql`lower(${liveStreams.streamerName}) = ${handle}`)
      .limit(1)
  ])

  const row = rows[0]
  if (!row) return null
  const session = live[0]

  return {
    handle: row.handle,
    name: toDisplayName(row),
    tagline: row.tagline ?? '',
    bio: row.bio ?? '',
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    websiteUrl: row.website_url,
    location: row.location,
    verified: row.verified,
    joinedAt: formatJoined(row.joined_at),
    followerCount: row.followers,
    totalViews: formatCount(row.total_views),
    clipCount: row.clip_count,
    categories: toCategories(row.categories),
    live: session
      ? {
          slug: session.streamerName,
          title: session.title,
          category: session.category,
          viewers: `${formatCount(session.viewerCount)} watching`,
          uptime: formatUptime(session.startedAt),
          image: session.thumbnailUrl
        }
      : null,
    isFollowing: row.is_following
  }
}

/** Ordering for a channel's own video grid. */
const VIDEO_ORDER = {
  latest: desc(clips.createdAt),
  popular: desc(clips.views),
  oldest: asc(clips.createdAt)
} satisfies Record<ChannelVideoSort, unknown>

/** Everything this channel has published, in the order the tab asked for. */
export async function readChannelVideos(
  name: string,
  sort: ChannelVideoSort = 'latest'
): Promise<Clip[]> {
  const rows = await db
    .select()
    .from(clips)
    .where(sql`lower(${clips.creator}) = ${toChannelHandle(name)}`)
    .orderBy(VIDEO_ORDER[sort])
    .limit(60)

  return rows.map(toClip)
}
