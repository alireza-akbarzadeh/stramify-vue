import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, follows, liveStreams } from '../db/schema'
import {  formatUptime } from './format'
import { landscapeClips, toClip } from './discovery'
import { toChannelDisplayName, toChannelHandle } from '#shared/utils/channel'
import type { Clip, ClipCategory } from '#shared/types/discovery'
import type {
  ChannelListItem,
  ChannelNotifyMode,
  ChannelProfile,
  ChannelSort,
  ChannelVideoSort
} from '#shared/types/channel'
import type { ChannelSummary } from '#shared/types/watch'
import { FOLLOWING_FRESH_DAYS } from '#shared/types/following'
import type { FollowedChannel } from '#shared/types/following'

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
  /**
   * `clip_count` minus shorts. The directory has always counted every clip and
   * keeps doing so; `/following` needs the number that matches the channel
   * page's Videos tab, which is landscape-only (`readChannelVideos`).
   */
  landscape_clip_count: number
  /** Newest upload, for the "new this week" ring on `/following`. */
  last_published: Date | null
  live_count: number
  live_title: string | null
  /** Streamer name in its own casing — the watch-page slug for a live session. */
  live_label: string | null
  top_thumbnail: string | null
  categories: string[] | null
  label: string | null
  is_following: boolean
  /** Only non-null for a channel the viewer follows. See `followedOnly`. */
  notify: ChannelNotifyMode | null
  followed_at: Date | null
}

/**
 * Every channel in the system with its derived stats.
 *
 * "Every channel" is the union of four sources, because a channel exists as
 * soon as it has *anything*: a row in `channels` (identity written, maybe no
 * uploads yet), a clip, a live session, or a follower. Aggregating in one
 * statement rather
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
  /**
   * Restrict to channels this viewer follows. Needs `userId`; without one
   * `my_follows` is empty and this would return nothing, so it's ignored.
   */
  followedOnly?: boolean
  /**
   * Overrides `ORDER_BY[sort]`. `ChannelSort` is the directory's public sort
   * menu, so an ordering that only one caller wants (recently-followed) is
   * passed in here rather than added to a type the UI renders as options.
   */
  order?: SQL
}) {
  const {
    handle,
    search,
    category,
    sort = 'top',
    limit = 60,
    userId = null,
    followedOnly = false,
    order
  } = options

  return db.execute<ChannelRow>(sql`
    with clip_stats as (
      select lower(creator) as handle,
             max(creator) as label,
             count(*)::int as clip_count,
             count(*) filter (where orientation = 'landscape')::int as landscape_clip_count,
             coalesce(sum(views), 0)::int as total_views,
             min(created_at) as first_published,
             max(created_at) as last_published,
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
      select lower(channel) as handle, notify, created_at as followed_at
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
      -- A channel you follow is a channel, even if everything it published has
      -- since been deleted. Without this arm followedOnly would quietly drop
      -- it and /following would under-report its own list. Signed out,
      -- my_follows is empty, so nothing else sees a difference.
      -- (No backticks in here: this comment lives inside a JS template
      -- literal, and one would close the string mid-query.)
      union select handle from my_follows
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
           coalesce(cs.landscape_clip_count, 0) as landscape_clip_count,
           cs.last_published,
           coalesce(ls.live_count, 0) as live_count,
           ls.live_title,
           ls.label as live_label,
           cs.top_thumbnail,
           cats.categories,
           coalesce(cs.label, ls.label) as label,
           (mf.handle is not null) as is_following,
           mf.notify,
           mf.followed_at
    from all_handles h
    left join channels c on c.handle = h.handle
    left join clip_stats cs on cs.handle = h.handle
    left join live_stats ls on ls.handle = h.handle
    left join follow_stats fs on fs.handle = h.handle
    left join category_stats cats on cats.handle = h.handle
    left join my_follows mf on mf.handle = h.handle
    where ${handle ? sql`h.handle = ${handle}` : sql`true`}
      and ${followedOnly && userId ? sql`mf.handle is not null` : sql`true`}
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
    order by ${order ?? ORDER_BY[sort]}
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

/**
 * `/following`'s order: anyone on air right now, then most recently followed.
 *
 * Live first because it's the only thing on the page that expires — a session
 * you miss is gone, an upload isn't. After that, newest follow first, so a
 * channel you just subscribed to is where you left it rather than buried under
 * whoever has the biggest numbers.
 */
const FOLLOWED_ORDER = sql`
  (coalesce(ls.live_count, 0) > 0) desc,
  mf.followed_at desc nulls last,
  h.handle asc
`

/**
 * How many follows one page will render. Far past any real account, and it
 * keeps a pathological one from turning the story rail into a memory problem.
 */
const FOLLOWED_LIMIT = 200

function toFollowedChannel(row: ChannelRow, now: number): FollowedChannel {
  const published = row.last_published ? new Date(row.last_published).getTime() : null
  return {
    handle: row.handle,
    name: toDisplayName(row),
    tagline: row.tagline ?? '',
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    verified: row.verified,
    followerCount: row.followers,
    clipCount: row.landscape_clip_count,
    isLive: row.live_count > 0,
    liveTitle: row.live_title,
    // The streamer's own casing, which is what `/watch/[slug]` resolves.
    liveSlug: row.live_count > 0 ? (row.live_label ?? row.handle) : null,
    // A followed row always has a `notify`; the fallback is for the impossible
    // case rather than a real default, and matches `readChannelSummary`.
    notify: (row.notify ?? 'all') as ChannelNotifyMode,
    // Through `new Date` rather than straight to `toISOString`: `db.execute`
    // hands back whatever the driver parsed the column into, and `formatJoined`
    // above already hedges the same way for `joined_at`.
    followedAt: new Date(row.followed_at ?? 0).toISOString(),
    hasNew:
      published !== null && now - published <= FOLLOWING_FRESH_DAYS * 86_400_000,
    categories: toCategories(row.categories)
  }
}

/**
 * Every channel this viewer follows.
 *
 * Lives here rather than in `utils/following.ts` because it is the same CTE and
 * the same row mapper as the directory — one `followedOnly` flag apart — and
 * duplicating that query to keep the file names tidy is exactly the trade
 * CLAUDE.md rule 10 says not to make. The *videos* half of `/following` is a
 * clips query and does live in `utils/following.ts`.
 */
export async function listFollowedChannels(userId: string): Promise<FollowedChannel[]> {
  const rows = await selectChannelRows({
    userId,
    followedOnly: true,
    order: FOLLOWED_ORDER,
    limit: FOLLOWED_LIMIT
  })
  // One clock for the whole page, so two channels published a millisecond
  // apart can't disagree about whether "this week" has elapsed.
  const now = Date.now()
  return [...rows].map((row) => toFollowedChannel(row, now))
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
    .where(and(sql`lower(${clips.creator}) = ${toChannelHandle(name)}`, landscapeClips))
    .orderBy(VIDEO_ORDER[sort])
    .limit(60)

  return rows.map(toClip)
}
