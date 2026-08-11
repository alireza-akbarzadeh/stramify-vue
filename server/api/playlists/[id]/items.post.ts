import { z } from 'zod'
import { addToPlaylist } from '../../../utils/playlists'
import { requireUser } from '../../../utils/session'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })
const bodySchema = z.object({ clipId: z.string().min(1).max(200) })

/**
 * Add a clip to a playlist.
 *
 * Idempotent — adding something already in the list returns 200 with
 * `added: true`, because that *is* the state the caller asked for. The "Save
 * to playlist" menu is a checkbox list where a double-press is ordinary, and
 * an error there would be reporting a failure that didn't happen.
 *
 * One 404 covers both "no such playlist" and "not yours", so the response
 * can't be used to enumerate other people's playlist ids.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  const body = bodySchema.safeParse(await readBody(event))
  if (!params.success || !body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playlist request' })
  }

  const user = await requireUser(event)
  if (!(await addToPlaylist(user.id, params.data.id, body.data.clipId))) {
    throw createError({ statusCode: 404, statusMessage: 'That playlist or video is not available' })
  }

  return { added: true }
})
