import { selectMixes } from '../../utils/mix'
import { getSessionUser } from '../../utils/session'
import type { MixSummary } from '#shared/types/mix'

/**
 * The "Mixes for you" shelf.
 *
 * Works signed out, unlike the other two personalised rails: with no session
 * the seeds fall back to reach alone, which is still a useful shelf (the top
 * channels and the biggest categories) rather than an empty one. That's why
 * this returns a list for everyone instead of `[]` for anonymous viewers.
 */
export default defineEventHandler(async (event): Promise<MixSummary[]> => {
  const user = await getSessionUser(event)
  return await selectMixes(user?.id ?? null)
})
