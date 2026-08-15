import { z } from 'zod'
import { requireUser } from '~~/server/utils/session'
import { channelHandle, readDashboardAnalytics } from '~~/server/utils/dashboard'
import { ANALYTICS_RANGES } from '#shared/utils/trend'
import type { DashboardAnalytics } from '#shared/types/dashboard'

// Spread into a mutable tuple: `ANALYTICS_RANGES` is `readonly`, and that is
// the one shape `z.enum` has historically been fussy about.
const querySchema = z.object({
  range: z.enum([...ANALYTICS_RANGES]).default('30d')
})

/**
 * Channel analytics for the signed-in user's own handle.
 *
 * The handle is taken from the session, never from a query parameter — that
 * is the authorization boundary. There is no `?channel=` here on purpose:
 * with no `channels` table (ADR-014) a handle parameter would let anyone read
 * anyone else's numbers.
 */
export default defineEventHandler(async (event): Promise<DashboardAnalytics> => {
  const user = await requireUser(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid analytics range' })
  }

  return readDashboardAnalytics(channelHandle(user), parsed.data.range)
})
