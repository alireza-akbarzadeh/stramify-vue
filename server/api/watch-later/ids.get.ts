import { getSessionUser } from '../../utils/session'
import { selectWatchLaterIds } from '../../utils/watch-later'

/**
 * Which clips are in the viewer's Watch later queue — ids only.
 *
 * This is what makes the bookmark on a card truthful anywhere in the app: the
 * grids on `/search`, `/clips`, a channel page and the home feed all need the
 * saved flag, and none of them want the queue's sixty joined rows to get it.
 * One small query, cached under the same key as the list, so saving from any
 * surface lights up every other copy of that card.
 *
 * `[]` rather than a 401 when signed out, matching `GET /api/watch-later`:
 * "nothing saved" is the honest answer for a visitor with no account, and it
 * keeps a logged-out grid from rendering an error for a decoration.
 *
 * No query parameters at all — scoping is the session's, and there is nothing
 * here to filter or page.
 */
export default defineEventHandler(async (event): Promise<string[]> => {
  const user = await getSessionUser(event)
  if (!user) return []

  return await selectWatchLaterIds(user.id)
})
