import { z } from 'zod'
import { resolveWatchTarget, selectRelated } from '../../../utils/watch'
import type { RelatedItem } from '#shared/types/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })
const LIMIT = 12

/**
 * Up-next rail. The query lives in `selectRelated` because the AI picks
 * endpoint ranks the same candidate set — see the note there.
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

  return selectRelated(resolved, LIMIT)
})
