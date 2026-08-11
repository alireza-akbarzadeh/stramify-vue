import { listFollowedChannels } from '../../utils/channels'
import { getSessionUser } from '../../utils/session'
import type { FollowedChannel } from '#shared/types/following'

/**
 * The channels the signed-in viewer follows.
 *
 * Returns `[]` rather than a 401 when signed out, matching
 * `/api/home/following`: "which channels do you follow" has an honest answer
 * for a visitor with no session, and the page renders a sign-in prompt off the
 * empty list instead of an error state.
 *
 * Read-only and scoped to the caller's own follows — `userId` comes from the
 * session, never from the request, so there is no way to ask for someone
 * else's list.
 */
export default defineEventHandler(async (event): Promise<FollowedChannel[]> => {
  const user = await getSessionUser(event)
  if (!user) return []
  return await listFollowedChannels(user.id)
})
