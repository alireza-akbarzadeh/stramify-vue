import { z } from 'zod'
import { deletePlaylist } from '../../../utils/playlists'
import { requireUser } from '../../../utils/session'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })

/**
 * Delete a playlist you own. Its items go with it via the FK's cascade.
 *
 * A playlist belonging to someone else answers 404, not 403: the caller has no
 * business knowing the id exists. Ownership is enforced in the `where` of the
 * delete itself (`deletePlaylist`), so this is one statement with no
 * check-then-act window.
 */
export default defineEventHandler(async (event) => {
  const parsed = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playlist' })
  }

  const user = await requireUser(event)
  if (!(await deletePlaylist(user.id, parsed.data.id))) {
    throw createError({ statusCode: 404, statusMessage: 'That playlist is not available' })
  }

  return { deleted: true }
})
