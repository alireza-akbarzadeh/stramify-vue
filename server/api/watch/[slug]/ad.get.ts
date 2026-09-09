import { z } from 'zod'
import { resolveWatchTarget } from '../../../utils/watch'
import { getSessionUser } from '../../../utils/session'
import { selectBillingState } from '../../../utils/subscriptions'
import { selectPreRoll } from '../../../utils/ads'
import type { AdBreakResponse } from '#shared/types/ads'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * The pre-roll to play before this video, or `{ ad: null }`.
 *
 * Signed out is a valid caller and gets an ad — that is the free tier. A signed
 * in viewer's entitlement is read from the subscription mirror on every request
 * rather than trusted from anything the client sent, so cancelling a plan stops
 * being ad-free at the next page load and not whenever a cached token expires.
 *
 * Live streams get nothing. A pre-roll delays joining a broadcast that is
 * already in progress, so the ad would be sold against time the viewer has
 * demonstrably already lost — mid-roll during a live break is the shape that
 * makes sense there, and it is not built.
 */
export default defineEventHandler(async (event): Promise<AdBreakResponse> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }
  if (resolved.kind === 'live') return { ad: null }

  const user = await getSessionUser(event)
  // Signed out has no subscription to read, and no row would be found anyway —
  // skipping the query keeps the anonymous path to one database round trip.
  const tier = user ? (await selectBillingState(user.id)).tier : 'starter'

  return { ad: await selectPreRoll(tier) }
})
