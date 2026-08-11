import { z } from 'zod'
import { deleteWatchProgress } from '../../../utils/progress'
import { requireUser } from '../../../utils/session'
import { resolveWatchTarget } from '../../../utils/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * Forget a clip's saved position — the "Remove from Continue watching" item on
 * the rail's card.
 *
 * Deleting the row rather than marking it completed: the viewer is saying "stop
 * offering me this", not "I finished it", and the two differ the next time they
 * open the clip. A deleted row means the next play starts a fresh position; a
 * completed one would keep the old playhead around forever.
 *
 * Idempotent — removing a position that isn't there returns 200. The rail's
 * optimistic removal has already happened by the time this lands, so a 404 on a
 * double-click would surface an error for something that is exactly the state
 * the viewer asked for.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const user = await requireUser(event)
  const resolved = await resolveWatchTarget(params.data.slug)
  if (!resolved || resolved.kind !== 'clip') {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  // Scoped to the caller inside `deleteWatchProgress` — the slug in the URL
  // names the clip, never whose progress is being deleted.
  await deleteWatchProgress(user.id, resolved.row.id)
  return { removed: true }
})
