import { z } from 'zod'
import { addLike } from '../../utils/liked'
import { requireUser } from '../../utils/session'

const bodySchema = z.object({ clipId: z.string().min(1).max(200) })

/**
 * Like a clip outright — the undo behind "Removed from Liked videos".
 *
 * The `DELETE` twin's mirror image, and idempotent for the same reason: the
 * card is restored optimistically, so a repeat press must not surface an error
 * for the outcome already on screen. See `addLike` for why this exists
 * alongside the watch page's toggle rather than reusing it.
 */
export default defineEventHandler(async (event) => {
  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid liked videos request' })
  }

  const user = await requireUser(event)
  const liked = await addLike(user.id, body.data.clipId)
  if (!liked) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return { liked: true }
})
