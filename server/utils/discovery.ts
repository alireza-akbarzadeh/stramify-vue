import { and, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips } from '../db/schema'
import type { liveStreams } from '../db/schema'
import { formatAge, formatUptime } from './format'
import { CATEGORY_DESCRIPTIONS, toCategorySlug } from '#shared/utils/category'
import type { CategorySummary, Clip, ClipCategory, LiveSignal } from '#shared/types/discovery'

export type ClipRow = typeof clips.$inferSelect
export type LiveStreamRow = typeof liveStreams.$inferSelect

/**
 * The filter every 16:9 surface applies: the clips grid, a channel's Videos
 * tab and the up-next rail all render `Clip`/`RelatedItem` cards with an
 * `aspect-video` thumbnail, and a portrait short in one of those is two black
 * bars. `/shorts` owns the vertical half of the table (see
 * `server/utils/shorts.ts`); the home feed applies the same rule in raw SQL.
 */
export const landscapeClips = eq(clips.orientation, 'landscape')

/**
 * The filter every *browse* surface applies, now that creators can upload
 * (ADR-028): a clip appears in a feed, a grid, a shelf, a search result or a
 * channel's tab only if its owner published it.
 *
 * `unlisted` is excluded here alongside `private` — that is the entire
 * difference between the two, and it lives in this one expression so the rule
 * can't be half-applied. What `unlisted` keeps is resolution by id, which
 * happens in `server/utils/watch.ts`, not here.
 *
 * Deliberately *not* applied to the surfaces keyed by a clip the viewer
 * already chose — liked, watch later, playlists, history, continue-watching.
 * A clip can only get into one of those by having been watchable when it was
 * saved, and dropping it the moment its owner unpublishes would silently edit
 * someone else's library rather than protect anything.
 *
 * Every seeded row is `public` (the migration's default backfilled them), so
 * this changed no existing behaviour the day it landed.
 */
export const publishedClips = eq(clips.visibility, 'public')

/**
 * The same rule for the queries built as raw SQL (`home`, `following`,
 * `shorts`, `channels`), where the table is aliased `c`. Kept beside its
 * Drizzle twin so a change to one is an obvious prompt to change the other.
 */
export const publishedClipsSql = sql`c.visibility = 'public'`

/** Live-stream row → wire shape. Same contract for the `/live` grid and the signals rail. */
export function toLiveSignal(row: LiveStreamRow): LiveSignal {
  return {
    id: row.id,
    name: row.streamerName,
    title: row.title,
    category: row.category,
    viewers: `${formatCount(row.viewerCount)} watching`,
    uptime: formatUptime(row.startedAt),
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl
  }
}

/** Shared row → wire mapper so every discovery route returns the same shape. */
export function toClip(row: ClipRow): Clip {
  return {
    id: row.id,
    title: row.title,
    creator: row.creator,
    category: row.category,
    age: row.featured ? 'Now' : formatAge(row.createdAt),
    views: `${formatCount(row.views)} ${row.featured ? 'watching' : 'views'}`,
    duration: formatDuration(row.durationSeconds),
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl
  }
}

function toSummary(row: {
  name: ClipCategory
  clipCount: number
  totalViews: number
  previewImage: string | null
}): CategorySummary {
  return {
    slug: toCategorySlug(row.name),
    name: row.name,
    description: CATEGORY_DESCRIPTIONS[row.name],
    clipCount: row.clipCount,
    totalViews: formatCount(row.totalViews),
    previewImage: row.previewImage
  }
}

/** A category with no clips yet — real zeroes, not placeholder numbers. */
export function emptyCategorySummary(name: ClipCategory): CategorySummary {
  return toSummary({ name, clipCount: 0, totalViews: 0, previewImage: null })
}

/**
 * Category listing derived from `clips` (no `categories` table): one row per
 * category that has clips, with the most-watched clip's thumbnail as preview.
 * Pass `name` to aggregate a single category.
 */
export async function selectCategorySummaries(name?: ClipCategory): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      name: clips.category,
      clipCount: count(clips.id),
      totalViews: sql<number>`coalesce(sum(${clips.views}), 0)::int`,
      previewImage: sql<
        string | null
      >`(array_agg(${clips.thumbnailUrl} order by ${clips.views} desc))[1]`
    })
    .from(clips)
    // Counts have to agree with what `/category/[slug]` actually lists, and
    // that page is a 16:9 grid — so shorts are outside this total too.
    .where(and(publishedClips, landscapeClips, name ? eq(clips.category, name) : undefined))
    .groupBy(clips.category)
    .orderBy(desc(count(clips.id)))

  return rows.map(toSummary)
}
