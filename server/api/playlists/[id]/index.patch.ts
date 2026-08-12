import { z } from 'zod'
import { updatePlaylist } from '../../../utils/playlists'
import { requireUser } from '../../../utils/session'
import { PLAYLIST_DESCRIPTION_MAX, PLAYLIST_TITLE_MAX } from '#shared/types/library'
import type { PlaylistSummary } from '#shared/types/library'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })

/**
 * Every field is optional — this is a patch, not a replacement — but
 * `description` is deliberately *not* `.min(1)`: an empty string is how the
 * form says "I cleared this", and `updatePlaylist` turns it into `null`.
 */
const bodySchema = z.object({
  title: z.string().trim().min(1).max(PLAYLIST_TITLE_MAX).optional(),
  description: z.string().trim().max(PLAYLIST_DESCRIPTION_MAX).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional()
})

/**
 * Edit a playlist you own: rename it, rewrite the description, or change who
 * can open it.
 *
 * 404 rather than 403 for someone else's playlist, matching `DELETE` — the
 * caller has no business learning the id exists. Ownership is enforced in the
 * `where` of the update itself.
 */
export default defineEventHandler(async (event): Promise<PlaylistSummary> => {
  const params = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playlist' })
  }

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Give the playlist a title' })
  }

  const user = await requireUser(event)
  const updated = await updatePlaylist(user.id, params.data.id, body.data)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'That playlist is not available' })
  }

  return updated
})
