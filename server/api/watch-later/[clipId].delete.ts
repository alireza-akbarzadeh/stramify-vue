import { z } from 'zod'
import { requireUser } from '../../utils/session'
import { removeFromWatchLater } from '../../utils/watch-later'

const paramsSchema = z.object({ clipId: z.string().min(1).max(200) })

/**
 * Remove a clip from Watch later.
 *
 * Idempotent like its `POST` twin, and for a sharper reason: both the rail and
 * the page remove the card optimistically, so a repeat press — a double tap, a
 * retry after a flaky connection — must not surface an error for exactly the
 * outcome already on screen. "It isn't in your queue" is success here.
 */
export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({ clipId: getRouterParam(event, 'clipId') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch later request' })
  }

  const user = await requireUser(event)
  await removeFromWatchLater(user.id, parsed.data.clipId)

  return { removed: true }
})
