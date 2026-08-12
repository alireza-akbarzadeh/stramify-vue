import { z } from 'zod'
import { removeLike } from '../../utils/liked'
import { requireUser } from '../../utils/session'

const paramsSchema = z.object({ clipId: z.string().min(1).max(200) })

/**
 * Take back a like from the `/liked` page.
 *
 * A dedicated route rather than reusing `POST /api/watch/[slug]/reaction`,
 * which *toggles*: on a page whose whole premise is "these are liked", a toggle
 * that arrives against a stale row would re-like the video the viewer just
 * asked to drop. "Remove" here means remove, whatever the row currently says.
 *
 * Idempotent for the same reason the Watch later delete is: the card goes
 * optimistically, so a repeat press — a double tap, a retry after a flaky
 * connection — must not surface an error for the outcome already on screen.
 */
export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({ clipId: getRouterParam(event, 'clipId') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid liked videos request' })
  }

  const user = await requireUser(event)
  await removeLike(user.id, parsed.data.clipId)

  return { removed: true }
})
