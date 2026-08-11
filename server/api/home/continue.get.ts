import { selectContinueWatching } from '../../utils/progress'
import { getSessionUser } from '../../utils/session'
import type { ContinueWatchingItem } from '#shared/types/library'

/**
 * The "Continue watching" rail.
 *
 * Returns `[]` rather than a 401 when signed out, matching
 * `/api/home/following`: it's a read-only personalisation shelf, and "nothing
 * to resume" is the honest answer for a visitor with no account. The home page
 * renders nothing at all in that case instead of an empty shelf inviting a
 * login.
 */
export default defineEventHandler(async (event): Promise<ContinueWatchingItem[]> => {
  const user = await getSessionUser(event)
  return await selectContinueWatching(user?.id ?? null)
})
