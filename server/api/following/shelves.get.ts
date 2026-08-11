import { listFollowingShelves } from '../../utils/following'
import { getSessionUser } from '../../utils/session'
import type { FollowingShelf } from '#shared/types/following'

/**
 * A shelf of recent videos per followed channel, most-published channel first.
 *
 * Same signed-out contract as `channels.get.ts` — an empty list, not a 401.
 * Kept separate from that endpoint rather than folded into one payload because
 * the two answer different questions and cache independently: the channel list
 * is small and paints the story rail immediately, while this one is the heavy
 * query behind the shelves below it.
 */
export default defineEventHandler(async (event): Promise<FollowingShelf[]> => {
  const user = await getSessionUser(event)
  return await listFollowingShelves(user?.id ?? null)
})
