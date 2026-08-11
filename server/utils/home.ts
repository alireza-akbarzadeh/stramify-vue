import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { notSuppressed } from './feedback'
import { formatAge, formatDuration, formatUptime } from './format'
import { formatCount } from '#shared/utils/format'
import { HOME_PAGE_SIZE } from '#shared/types/home'
import type { HomeFeedPage, HomeReason, HomeVideo } from '#shared/types/home'
import type { CategorySlug, ClipCategory } from '#shared/types/discovery'

/**
 * How the home feed ranks, written down instead of tuned by feel.
 *
 * Both popularity signals are logged before they're added so one runaway
 * number can't own the whole page — the same reasoning as the channel
 * directory's `RANK_SCORE` in `channels.ts`. On top of that:
 *
 * - **Likes count 1.5× a view.** Pressing like is a deliberate act; a view is
 *   not. Dislikes subtract at 1× — enough to sink a badly received upload,
 *   not enough to let a brigade bury it.
 * - **Following adds a flat 3.** In log space that's roughly the distance
 *   between a 1k-view video and a 20k-view one, so a channel you subscribe to
 *   reliably outranks a stranger with similar numbers without burying
 *   everything else — the feed stays a feed, not a subscriptions page (that
 *   rail exists separately, see `selectFollowingFeed`).
 * - **Live adds 1.5.** Something happening now beats a recording of something
 *   that already happened, which is the same rule search and up-next follow.
 * - **Recency decays hyperbolically**: +2 on the day of publication, +1 after
 *   a day, ~+0.3 after a week. New uploads get a real chance at the first
 *   screen and then fall back on their own numbers. `now()` is cast to
 *   `timestamp` because both date columns are timezone-naive.
 *
 * No watch history exists yet, so there is no collaborative signal to use.
 * Inventing one off nothing would be theatre (CLAUDE.md rule 2); when view
 * events land in Phase 12 this expression is the one place that changes.
 */
export const SCORE = sql`
  ln(1 + cand.audience)
  + (ln(1 + coalesce(rx.likes, 0)) * 1.5)
  - ln(1 + coalesce(rx.dislikes, 0))
  + (case when mf.handle is not null then 3 else 0 end)
  + (case when cand.kind = 'live' then 1.5 else 0 end)
  + (2 / (1 + (extract(epoch from (now()::timestamp - cand.published_at)) / 86400)))
`

/**
 * One ranked candidate. Clips and live sessions are normalised into the same
 * columns by the union below — `audience` is a final view count or a live
 * viewer count, `published_at` is an upload date or a session start — so the
 * score is one expression rather than two that could drift apart.
 */
export type FeedRow = {
  id: string
  slug: string
  kind: 'clip' | 'live'
  title: string
  channel: string
  category: ClipCategory
  image: string
  video_url: string
  audience: number
  published_at: Date
  duration_seconds: number | null
  avatar_url: string | null
  followed: boolean
}

/**
 * Everything watchable, in one relation.
 *
 * A `union all` in a CTE rather than two queries merged in JS: ordering and
 * `limit` have to happen across both kinds at once, and doing that in memory
 * would mean fetching the whole catalogue on every page request.
 */
export const CANDIDATES = sql`
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
  -- Shorts have their own full-screen feed at /shorts; a 9:16 video in this
  -- page's 16:9 card is two black bars. Same rule as landscapeClips in
  -- utils/discovery.ts, spelled in SQL because this query is raw.
  where c.orientation = 'landscape'
  union all
  select l.id,
         l.streamer_name as slug,
         'live' as kind,
         l.title,
         l.streamer_name as channel,
         l.category::text as category,
         l.thumbnail_url as image,
         l.video_url,
         l.viewer_count as audience,
         l.started_at as published_at,
         null::int as duration_seconds
  from live_streams l
`

/** Like/dislike totals per target, counted from `reactions` — no stored counter to drift. */
export const REACTION_STATS = sql`
  select target_id,
         target_kind::text as target_kind,
         count(*) filter (where value = 'like')::int as likes,
         count(*) filter (where value = 'dislike')::int as dislikes
  from reactions
  group by target_id, target_kind
`

/** The signed-in user's follows, lowercased to match `lower(channel)` everywhere else. */
export function myFollows(userId: string | null) {
  return sql`
    select lower(channel) as handle
    from follows
    where ${userId ? sql`user_id = ${userId}` : sql`false`}
  `
}

/** Age in days — the cut-off for the "New upload" label. */
const NEW_UPLOAD_DAYS = 2

/**
 * Why this row is on screen, in precedence order. A followed channel wins even
 * when the session is also live: that's the reason *this viewer* is seeing it.
 * Popular-by-numbers returns `null` — the card shows nothing rather than
 * dressing "it has a lot of views" up as a personal recommendation.
 */
function toReason(row: FeedRow): HomeReason | null {
  if (row.followed) return 'following'
  if (row.kind === 'live') return 'live'
  const ageDays = (Date.now() - new Date(row.published_at).getTime()) / 86_400_000
  return ageDays <= NEW_UPLOAD_DAYS ? 'new' : null
}

/** Secondary line: a live count now, or a final count plus how long ago. */
function toMeta(row: FeedRow): string {
  return row.kind === 'live'
    ? `${formatCount(row.audience)} watching · live ${formatUptime(new Date(row.published_at))}`
    : `${formatCount(row.audience)} views · ${formatAge(new Date(row.published_at))}`
}

export function toHomeVideo(row: FeedRow): HomeVideo {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    channel: row.channel,
    category: row.category,
    image: row.image,
    videoUrl: row.video_url,
    meta: toMeta(row),
    duration: row.duration_seconds === null ? undefined : formatDuration(row.duration_seconds),
    avatarUrl: row.avatar_url,
    reason: toReason(row)
  }
}

export interface HomeFeedOptions {
  /** Category chip, or `null` for "All". */
  category?: CategorySlug | null
  /** The "Live" chip — sessions on air only. */
  liveOnly?: boolean
  /** Offset of the first row to return; `0` is the first page. */
  cursor?: number
  limit?: number
  /** Signed-in viewer, so their follows can weigh on the ranking. */
  userId?: string | null
}

/**
 * The recommended feed: one ranked page across clips and live sessions.
 *
 * Paged by offset rather than a keyset cursor. The ranking is deterministic
 * for a given viewer (ties break on id), and offsets stay cheap at this
 * catalogue size; a keyset on a computed score would mean sending the score
 * to the client, which pins the ranking formula into the URL.
 */
export async function selectHomeFeed(options: HomeFeedOptions = {}): Promise<HomeFeedPage> {
  const {
    category = null,
    liveOnly = false,
    cursor = 0,
    limit = HOME_PAGE_SIZE,
    userId = null
  } = options

  // One row past the page, so "is there more" is answered without a count(*).
  const rows = await db.execute<FeedRow>(sql`
    with candidates as (${CANDIDATES}),
         reaction_stats as (${REACTION_STATS}),
         my_follows as (${myFollows(userId)})
    select cand.id,
           cand.slug,
           cand.kind,
           cand.title,
           cand.channel,
           cand.category,
           cand.image,
           cand.video_url,
           cand.audience,
           cand.published_at,
           cand.duration_seconds,
           ch.avatar_url,
           (mf.handle is not null) as followed
    from candidates cand
    left join reaction_stats rx on rx.target_id = cand.id and rx.target_kind = cand.kind
    left join my_follows mf on mf.handle = lower(cand.channel)
    left join channels ch on ch.handle = lower(cand.channel)
    where ${category ? sql`lower(cand.category) = ${category}` : sql`true`}
      and ${liveOnly ? sql`cand.kind = 'live'` : sql`true`}
      -- Dropped before the limit, not after: hiding rows from an already-cut
      -- page would return short pages and repeat the offset on the next one.
      and ${notSuppressed(userId)}
    order by ${SCORE} desc, cand.id asc
    limit ${limit + 1} offset ${cursor}
  `)

  const page = [...rows]
  const hasMore = page.length > limit

  return {
    items: page.slice(0, limit).map(toHomeVideo),
    nextCursor: hasMore ? cursor + limit : null
  }
}

/** How many cards the subscriptions rail holds — one screenful, it scrolls. */
const FOLLOWING_LIMIT = 12

/**
 * Latest from the channels this viewer follows, live sessions first.
 *
 * Deliberately *not* the ranked feed filtered to followed channels: this rail
 * answers "what's new from my channels", so it sorts by recency, and a popular
 * old upload staying pinned to the front of it would be the wrong answer.
 * Returns `[]` when signed out or following nobody, so the caller renders
 * nothing instead of an empty shelf.
 *
 * Feed feedback applies here too. The rail is the only other place a home card
 * appears, and a "Not interested" that hides the card from the grid while
 * leaving the same video in the shelf above it reads as a broken button. The
 * follow itself is untouched — hiding a channel from the home page is not
 * unfollowing it, and undoing the feedback brings the shelf back.
 */
export async function selectFollowingFeed(userId: string | null): Promise<HomeVideo[]> {
  if (!userId) return []

  const rows = await db.execute<FeedRow>(sql`
    with candidates as (${CANDIDATES}),
         my_follows as (${myFollows(userId)})
    select cand.id,
           cand.slug,
           cand.kind,
           cand.title,
           cand.channel,
           cand.category,
           cand.image,
           cand.video_url,
           cand.audience,
           cand.published_at,
           cand.duration_seconds,
           ch.avatar_url,
           true as followed
    from candidates cand
    join my_follows mf on mf.handle = lower(cand.channel)
    left join channels ch on ch.handle = lower(cand.channel)
    where ${notSuppressed(userId)}
    order by (cand.kind = 'live') desc, cand.published_at desc
    limit ${FOLLOWING_LIMIT}
  `)

  return [...rows].map(toHomeVideo)
}
