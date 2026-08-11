import { selectPlaylists } from '../../utils/playlists'
import { getSessionUser } from '../../utils/session'
import type { PlaylistSummary } from '#shared/types/library'

/**
 * The viewer's own playlists.
 *
 * `[]` rather than a 401 signed out, matching every other personalised read on
 * the home page: a visitor with no account genuinely has no playlists, and the
 * library page renders its signed-out state from that instead of an error.
 */
export default defineEventHandler(async (event): Promise<PlaylistSummary[]> => {
  const user = await getSessionUser(event)
  return user ? await selectPlaylists(user.id) : []
})
