import { count, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips } from '../db/schema'
import type { liveStreams } from '../db/schema'
import { formatAge, formatDuration, formatUptime } from './format'
import { CATEGORY_DESCRIPTIONS, toCategorySlug } from '#shared/utils/category'
import type { CategorySummary, Clip, ClipCategory, LiveSignal } from '#shared/types/discovery'

export type ClipRow = typeof clips.$inferSelect
export type LiveStreamRow = typeof liveStreams.$inferSelect

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
    .where(name ? eq(clips.category, name) : undefined)
    .groupBy(clips.category)
    .orderBy(desc(count(clips.id)))

  return rows.map(toSummary)
}
