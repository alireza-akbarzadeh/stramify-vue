import { z } from 'zod'
import { readStudioVideo } from '~~/server/utils/studio'
import { requireUser } from '~~/server/utils/session'
import type { StudioVideo } from '#shared/types/studio'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })

/**
 * One upload, for the edit page.
 *
 * A separate endpoint from the list rather than a client-side `find` over it,
 * so `/studio/videos/<id>` renders on a hard load or a shared link without
 * first fetching every video the account owns.
 */
export default defineEventHandler(async (event): Promise<StudioVideo> => {
  const params = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid video' })
  }

  const user = await requireUser(event)
  const video = await readStudioVideo(user.id, params.data.id)
  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return video
})
