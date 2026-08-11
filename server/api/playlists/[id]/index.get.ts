import { z } from 'zod'
import { selectPlaylist } from '../../../utils/playlists'
import { getSessionUser } from '../../../utils/session'
import type { PlaylistDetail } from '#shared/types/library'

const paramsSchema = z.object({ id: z.string().min(1).max(200) })

/**
 * One playlist and its videos.
 *
 * Visibility is enforced inside `selectPlaylist`, which returns `null` for a
 * private playlist the caller doesn't own — so a private list and a
 * non-existent one produce the identical 404 here, and the response can't be
 * used to probe which ids exist.
 */
export default defineEventHandler(async (event): Promise<PlaylistDetail> => {
  const parsed = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playlist' })
  }

  const user = await getSessionUser(event)
  const playlist = await selectPlaylist(parsed.data.id, user?.id ?? null)
  if (!playlist) {
    throw createError({ statusCode: 404, statusMessage: 'That playlist is not available' })
  }

  return playlist
})
