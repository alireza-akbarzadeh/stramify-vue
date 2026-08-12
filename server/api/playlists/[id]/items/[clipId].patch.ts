import { z } from 'zod'
import { movePlaylistItem } from '../../../../utils/playlists'
import { requireUser } from '../../../../utils/session'

const paramsSchema = z.object({
  id: z.string().min(1).max(200),
  clipId: z.string().min(1).max(200)
})

const bodySchema = z.object({ direction: z.enum(['up', 'down']) })

/**
 * Move one clip a slot up or down its playlist.
 *
 * The body is a direction, not a position: the client's idea of index 3 can be
 * stale by the time it arrives (another tab removed an item), while "swap with
 * whatever is above you" is resolved against the rows as they actually are.
 *
 * 404 covers both a playlist that isn't yours and a clip that isn't in it —
 * same reasoning as the sibling `DELETE`.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({
    id: getRouterParam(event, 'id'),
    clipId: getRouterParam(event, 'clipId')
  })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playlist request' })
  }

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid move' })
  }

  const user = await requireUser(event)
  const moved = await movePlaylistItem(
    user.id,
    params.data.id,
    params.data.clipId,
    body.data.direction
  )
  if (!moved) {
    throw createError({ statusCode: 404, statusMessage: 'That playlist is not available' })
  }

  return { moved: true }
})
