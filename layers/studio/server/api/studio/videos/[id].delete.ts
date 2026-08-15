import { z } from 'zod'
import { deleteStudioVideo } from '~~/server/utils/studio'
import { requireUser } from '~~/server/utils/session'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })

/**
 * Permanently delete a video you own, along with its stored file and
 * thumbnail.
 *
 * There is no soft delete and no undo — which is exactly why the client puts
 * an `AlertDialog` in front of it that names the video and says what goes with
 * it. The cascade reaches comments, reactions, playlist entries and watch
 * history, so this is the most destructive thing the studio can do.
 */
export default defineEventHandler(async (event): Promise<{ deleted: boolean }> => {
  const params = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid video' })
  }

  const user = await requireUser(event)
  const deleted = await deleteStudioVideo(user.id, params.data.id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return { deleted }
})
