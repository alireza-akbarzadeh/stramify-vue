import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db/client'
import { follows } from '../../../db/schema'
import { requireUser } from '../../../utils/session'
import { readChannelSummary } from '../../../utils/channels'
import { CHANNEL_NOTIFY_MODES } from '#shared/types/channel'
import type { ChannelSummary } from '#shared/types/watch'

const paramsSchema = z.object({ name: z.string().min(1).max(100) })
// Spread into a mutable tuple, the way `dashboard/analytics.get.ts` does —
// `z.enum` has historically been fussy about a `readonly` one.
const bodySchema = z.object({ mode: z.enum([...CHANNEL_NOTIFY_MODES]) })

/**
 * Set the bell for a channel you already follow, returning the fresh summary
 * so the trigger and the follow state update from one round trip.
 *
 * Following is a precondition rather than something this route does for you:
 * `notify` lives on the follow row, so there is nowhere to put a preference
 * for a channel you don't follow. The UI only shows the bell to followers, and
 * the 409 is what catches the case where that stopped being true (an unfollow
 * in another tab) instead of silently creating a follow the viewer didn't ask
 * for.
 */
export default defineEventHandler(async (event): Promise<ChannelSummary> => {
  const parsed = paramsSchema.safeParse({ name: getRouterParam(event, 'name') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid channel name' })
  }

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid notification setting' })
  }

  const user = await requireUser(event)
  const name = parsed.data.name

  const updated = await db
    .update(follows)
    .set({ notify: body.data.mode })
    .where(
      and(eq(follows.userId, user.id), sql`lower(${follows.channel}) = lower(${name})`)
    )
    .returning({ id: follows.id })

  if (!updated.length) {
    throw createError({ statusCode: 409, statusMessage: 'Follow this channel first' })
  }

  return readChannelSummary(name, user.id)
})
