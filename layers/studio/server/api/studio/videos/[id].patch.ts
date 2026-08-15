import { z } from 'zod'
import { updateStudioVideo } from '~~/server/utils/studio'
import { requireUser } from '~~/server/utils/session'
import { CLIP_CATEGORIES } from '#shared/utils/category'
import { STUDIO_DESCRIPTION_MAX, STUDIO_TITLE_MAX } from '#shared/types/studio'
import type { StudioVideo } from '#shared/types/studio'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })

/**
 * Every field optional — this is a patch, not a replacement — but the two
 * strings differ in their floor for the same reason they do on playlists: a
 * title of spaces is an untitled video, while an empty description is the
 * form saying "I cleared this" and has to survive as far as the update.
 */
const bodySchema = z.object({
  title: z.string().trim().min(1).max(STUDIO_TITLE_MAX).optional(),
  description: z.string().trim().max(STUDIO_DESCRIPTION_MAX).optional(),
  category: z.enum(CLIP_CATEGORIES).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional()
})

/**
 * Edit a video you own.
 *
 * 404 rather than 403 for someone else's, matching `DELETE` and the playlist
 * endpoints: ownership is enforced in the `where` of the update, so a
 * mismatched id and a nonexistent one are indistinguishable from here — which
 * is the point.
 */
export default defineEventHandler(async (event): Promise<StudioVideo> => {
  const params = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid video' })
  }

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Give the video a title' })
  }

  const user = await requireUser(event)
  const updated = await updateStudioVideo(user.id, params.data.id, body.data)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return updated
})
