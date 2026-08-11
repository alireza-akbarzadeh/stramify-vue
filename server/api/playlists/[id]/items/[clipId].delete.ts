import { z } from 'zod'
import { removeFromPlaylist } from '../../../../utils/playlists'
import { requireUser } from '../../../../utils/session'

const paramsSchema = z.object({
  id: z.string().min(1).max(200),
  clipId: z.string().min(1).max(200)
})

/**
 * Remove a clip from a playlist.
 *
 * Idempotent like its `POST` twin: removing something that isn't there is the
 * state the caller wanted, and both the playlist page and the save menu remove
 * optimistically, so a 404 on a repeat press would surface an error for
 * exactly the outcome on screen. The 404 below is only for a playlist that
 * isn't yours or doesn't exist.
 */
export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({
    id: getRouterParam(event, 'id'),
    clipId: getRouterParam(event, 'clipId')
  })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playlist request' })
  }

  const user = await requireUser(event)
  if (!(await removeFromPlaylist(user.id, parsed.data.id, parsed.data.clipId))) {
    throw createError({ statusCode: 404, statusMessage: 'That playlist is not available' })
  }

  return { removed: true }
})
