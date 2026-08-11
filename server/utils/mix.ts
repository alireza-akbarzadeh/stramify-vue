import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { CANDIDATES, myFollows, REACTION_STATS, SCORE, toHomeVideo } from './home'
import type { FeedRow } from './home'
import { fromCategorySlug } from '#shared/utils/category'
import {
  mixId,
  mixReason,
  mixSubtitle,
  mixTitle,
  MIX_COVER_COUNT,
  parseMixId
} from '#shared/utils/mix'
import { MIX_ITEM_LIMIT, MIX_RAIL_LIMIT } from '#shared/types/mix'
import type { MixDetail, MixSeed, MixSummary } from '#shared/types/mix'

/**
 * Mixes: "here's more of a thing you already like", as a shelf of openable
 * lists rather than more cards in the same ranked grid.
 *
 * **A mix is a query, not a row.** The id (`channel:viper_squadron`,
 * `category:gaming`) is enough to rebuild it, so nothing is stored and nothing
 * can go stale — a mix picks up an upload the moment it lands and drops a
 * deleted video on the next request. That's also why there's no migration
 * behind this feature.
 *
 * Ranking inside a mix reuses `SCORE` from `home.ts` verbatim rather than
 * inventing a second one. A mix is the home feed narrowed to one seed; if the
 * two orderings could disagree, the same two videos would sit in a different
 * order on two pages of the same site for no reason a viewer could explain.
 *
 * Known gap, deliberate: the "Not interested" suppression another session is
 * adding to `selectHomeFeed` does not apply here yet — that feature's table
 * has no migration at the time of writing. `notSuppressed(userId)` drops into
 * the same `where` clause below when it lands.
 */

/**
 * Fewer videos than this and it isn't a mix, it's a link to one video with
 * extra steps. Three is the minimum that fills the card's stacked cover.
 */
const MIN_MIX_ITEMS = 3

/**
 * Channels the viewer has actually watched, with how many of that channel's
 * clips they've touched. Distinct from following: continuing to press play on
 * someone is a stronger signal than a subscribe you made once in 2023.
 */
function myWatchedChannels(userId: string | null) {
  return sql`
    select lower(c.creator) as handle, count(*)::int as watched
    from watch_progress wp
    join clips c on c.id = wp.clip_id
    where ${userId ? sql`wp.user_id = ${userId}` : sql`false`}
    group by lower(c.creator)
  `
}

/**
 * One row of an opened mix: a feed row plus the two signals its subtitle needs
 * in order to describe itself honestly (see `mixReason`).
 */
type MixRow = FeedRow & { followed: boolean; watched: number }

/**
 * One seed row, before it becomes a `MixSummary`.
 *
 * A `type` alias rather than an `interface` because `db.execute<T>()` requires
 * `T extends Record<string, unknown>`, and only type aliases get the implicit
 * index signature that satisfies it. Same reason `FeedRow` in `home.ts` and
 * `ChannelRow` in `channels.ts` are written this way.
 */
type SeedRow = {
  key: string
  /** The channel's or category's own casing, for the label. */
  label: string
  followed: boolean
  /** How many of this channel's clips the viewer has started. 0 when signed out. */
  watched: number
  count: number
  covers: string[]
}

/**
 * Channel mixes, most relevant seed first.
 *
 * Ordered by follow, then by how much of the channel you've watched, then by
 * the channel's own reach — so a signed-in viewer's mixes are about them, and
 * a signed-out one still gets a sensible shelf instead of an empty rail.
 */
async function selectChannelSeeds(userId: string | null, limit: number): Promise<SeedRow[]> {
  const rows = await db.execute<SeedRow>(sql`
    with candidates as (${CANDIDATES}),
         my_follows as (${myFollows(userId)}),
         my_watched as (${myWatchedChannels(userId)})
    select lower(cand.channel) as key,
           min(cand.channel) as label,
           bool_or(mf.handle is not null) as followed,
           coalesce(max(mw.watched), 0)::int as watched,
           count(*)::int as count,
           (array_agg(cand.image order by cand.audience desc))[1:${MIX_COVER_COUNT}] as covers
    from candidates cand
    left join my_follows mf on mf.handle = lower(cand.channel)
    left join my_watched mw on mw.handle = lower(cand.channel)
    group by lower(cand.channel)
    having count(*) >= ${MIN_MIX_ITEMS}
    order by bool_or(mf.handle is not null) desc,
             coalesce(max(mw.watched), 0) desc,
             sum(cand.audience) desc,
             lower(cand.channel) asc
    limit ${limit}
  `)

  return [...rows]
}

/**
 * Category mixes. Affinity is "how many videos in this category have you
 * started or reacted to" — the two engagement signals that exist today.
 */
async function selectCategorySeeds(userId: string | null, limit: number): Promise<SeedRow[]> {
  const rows = await db.execute<SeedRow>(sql`
    with candidates as (${CANDIDATES}),
         my_affinity as (
           select lower(c.category::text) as category, count(*)::int as hits
           from watch_progress wp
           join clips c on c.id = wp.clip_id
           where ${userId ? sql`wp.user_id = ${userId}` : sql`false`}
           group by lower(c.category::text)
         )
    select lower(cand.category) as key,
           min(cand.category) as label,
           false as followed,
           0 as watched,
           count(*)::int as count,
           (array_agg(cand.image order by cand.audience desc))[1:${MIX_COVER_COUNT}] as covers
    from candidates cand
    left join my_affinity aff on aff.category = lower(cand.category)
    group by lower(cand.category)
    having count(*) >= ${MIN_MIX_ITEMS}
    order by coalesce(max(aff.hits), 0) desc, sum(cand.audience) desc, lower(cand.category) asc
    limit ${limit}
  `)

  return [...rows]
}

function toSummary(seed: MixSeed, row: SeedRow): MixSummary {
  return {
    id: mixId(seed, row.key),
    seed,
    title: mixTitle(row.label),
    subtitle: mixSubtitle(seed, row.label, mixReason(row.followed, row.watched)),
    covers: (row.covers ?? []).filter(Boolean),
    count: row.count
  }
}

/**
 * The "Mixes for you" shelf.
 *
 * Channel mixes lead and category mixes fill the rest of the row. That's the
 * specificity order: "more from this creator" is a sharper offer than "more
 * Gaming", so the sharper one goes where the eye lands first. The split is
 * two-thirds/one-third rather than fixed counts so a viewer following nobody
 * still gets a full rail of category mixes.
 */
export async function selectMixes(userId: string | null): Promise<MixSummary[]> {
  const channelSlots = Math.ceil(MIX_RAIL_LIMIT * (2 / 3))

  const [channelSeeds, categorySeeds] = await Promise.all([
    selectChannelSeeds(userId, channelSlots),
    selectCategorySeeds(userId, MIX_RAIL_LIMIT)
  ])

  const channelMixes = channelSeeds.map((row) => toSummary('channel', row))
  const categoryMixes = categorySeeds.map((row) => toSummary('category', row))

  return [...channelMixes, ...categoryMixes].slice(0, MIX_RAIL_LIMIT)
}

/** The `where` that narrows the candidate set to one seed. */
function seedFilter(seed: MixSeed, key: string) {
  return seed === 'channel'
    ? sql`lower(cand.channel) = ${key}`
    : sql`lower(cand.category) = ${key}`
}

/**
 * One mix, opened at `/mix/[id]`.
 *
 * Returns `null` for an id that parses but names nothing — an unknown channel
 * and a hand-typed id should look identical to a viewer, so the route answers
 * 404 for both rather than rendering an empty mix that looks broken.
 */
export async function selectMix(id: string, userId: string | null): Promise<MixDetail | null> {
  const parsed = parseMixId(id)
  if (!parsed) return null

  const { seed, key } = parsed
  // A category id is validated against the enum before it reaches SQL; an
  // unknown one is a 404, not a query that scans everything and finds nothing.
  if (seed === 'category' && !fromCategorySlug(key)) return null

  const rows = await db.execute<MixRow>(sql`
    with candidates as (${CANDIDATES}),
         reaction_stats as (${REACTION_STATS}),
         my_follows as (${myFollows(userId)}),
         my_watched as (${myWatchedChannels(userId)})
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
           (mf.handle is not null) as followed,
           coalesce(mw.watched, 0)::int as watched
    from candidates cand
    left join reaction_stats rx on rx.target_id = cand.id and rx.target_kind = cand.kind
    left join my_follows mf on mf.handle = lower(cand.channel)
    left join my_watched mw on mw.handle = lower(cand.channel)
    left join channels ch on ch.handle = lower(cand.channel)
    where ${seedFilter(seed, key)}
    order by ${SCORE} desc, cand.id asc
    limit ${MIX_ITEM_LIMIT}
  `)

  const items = [...rows]
  if (!items.length) return null

  return { mix: toDetailSummary(seed, key, items), items: items.map(toHomeVideo) }
}

/**
 * The header for an opened mix, built from the rows it just returned rather
 * than a second query — the label's casing and the cover thumbnails are both
 * already in hand.
 */
function toDetailSummary(seed: MixSeed, key: string, items: MixRow[]): MixSummary {
  const first = items[0]!
  const label = seed === 'channel' ? first.channel : (fromCategorySlug(key) ?? key)
  const reason = mixReason(
    items.some((item) => item.followed),
    Math.max(...items.map((item) => item.watched))
  )

  return {
    id: mixId(seed, key),
    seed,
    title: mixTitle(label),
    subtitle: mixSubtitle(seed, label, reason),
    covers: items.slice(0, MIX_COVER_COUNT).map((item) => item.image),
    count: items.length
  }
}
