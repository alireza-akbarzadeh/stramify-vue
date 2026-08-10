import { and, desc, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db/client'
import { clips, liveStreams } from '../../../db/schema'
import { clipToRelated, liveToRelated, resolveWatchTarget } from '../../../utils/watch'
import { landscapeClips } from '../../../utils/discovery'
import type { RelatedItem } from '#shared/types/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })
const LIMIT = 12

/**
 * Up-next rail: everything else in the same category, live channels first
 * (something happening now beats a recording). Category is the only signal
 * available — there's no watch history or recommender yet, and inventing a
 * relevance score off nothing would be theatre.
 */
export default defineEventHandler(async (event): Promise<RelatedItem[]> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  const { category } = resolved.target
  const [liveRows, clipRows] = await Promise.all([
    db
      .select()
      .from(liveStreams)
      .where(
        resolved.kind === 'live'
          ? and(eq(liveStreams.category, category), ne(liveStreams.id, resolved.row.id))
          : eq(liveStreams.category, category)
      )
      .orderBy(desc(liveStreams.viewerCount))
      .limit(LIMIT),
    db
      .select()
      .from(clips)
      .where(
        and(
          eq(clips.category, category),
          landscapeClips,
          resolved.kind === 'clip' ? ne(clips.id, resolved.row.id) : undefined
        )
      )
      .orderBy(desc(clips.views))
      .limit(LIMIT)
  ])

  return [...liveRows.map(liveToRelated), ...clipRows.map(clipToRelated)].slice(0, LIMIT)
})
