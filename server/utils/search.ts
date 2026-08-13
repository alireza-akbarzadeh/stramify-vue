import { and, desc, ilike, or, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, liveStreams } from '../db/schema'
import { publishedClips } from './discovery'
import { clipToRelated, liveToRelated } from './watch'
import type { RelatedItem } from '#shared/types/watch'

/**
 * A user's query as a SQL `LIKE` pattern.
 *
 * `%` and `_` are wildcards, and channel handles are full of underscores
 * (`Canvas_Queen`), so both get escaped with the backslash Postgres uses by
 * default — otherwise `canvas_queen` would also match `canvasXqueen`, and a
 * lone `%` would match the entire catalogue.
 */
export function toLikePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

/**
 * Videos matching a query: title, channel name, or category, across both VODs
 * and live sessions.
 *
 * Substring matching rather than a `tsvector` index — the catalogue is small,
 * this is what makes partial words work while someone is still typing
 * ("cyber" finding "Cyberpunk"), and a full-text index can be layered on
 * without the call sites changing. Live results come first: something
 * happening right now beats a recording of something that already happened.
 */
export async function searchVideos(query: string, limit: number): Promise<RelatedItem[]> {
  const pattern = toLikePattern(query)

  const [liveRows, clipRows] = await Promise.all([
    db
      .select()
      .from(liveStreams)
      .where(
        or(
          ilike(liveStreams.title, pattern),
          ilike(liveStreams.streamerName, pattern),
          // The category column is an enum — cast before matching it as text.
          sql`${liveStreams.category}::text ilike ${pattern}`
        )
      )
      .orderBy(desc(liveStreams.viewerCount))
      .limit(limit),
    db
      .select()
      .from(clips)
      .where(
        and(
          publishedClips,
          or(
            ilike(clips.title, pattern),
            ilike(clips.creator, pattern),
            sql`${clips.category}::text ilike ${pattern}`
          )
        )
      )
      .orderBy(desc(clips.views))
      .limit(limit)
  ])

  return [...liveRows.map(liveToRelated), ...clipRows.map(clipToRelated)].slice(0, limit)
}
