import { z } from 'zod'
import type { WatchTarget } from '#shared/types/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * The thing being watched — a clip or a live channel, resolved from one slug.
 * 404 is a real state the page renders ("this video isn't available"), not an
 * error to swallow.
 */
export default defineEventHandler(async (event): Promise<WatchTarget> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return resolved.target
})
