import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { clips } from '#server/db/schema'
import { db } from '#server/db/client.ts'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * Count a view. The client posts this once per slug per browser session
 * (see `useViewCounter`), so a reload or a scrub doesn't inflate the number.
 *
 * Live streams are a deliberate no-op: `live_streams.viewer_count` is
 * concurrent viewers, not cumulative views, and a counter that only ever goes
 * up would be a lie about how many people are actually watching. Real
 * concurrency tracking belongs to the Phase 7 ingest work.
 */
export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }
  if (resolved.kind !== 'clip') {
    return { counted: false, views: null }
  }

  const [row] = await db
    .update(clips)
    .set({ views: sql`${clips.views} + 1` })
    .where(eq(clips.id, resolved.row.id))
    .returning({ views: clips.views })

  return { counted: true, views: `${formatCount(row?.views ?? 0)} views` }
})
