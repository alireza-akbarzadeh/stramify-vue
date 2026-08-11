import { z } from 'zod'
import { selectMix } from '../../utils/mix'
import { getSessionUser } from '../../utils/session'
import type { MixDetail } from '#shared/types/mix'

/**
 * Ids are `"<seed>:<key>"`. Bounded like every other slug taken from a URL;
 * the shape itself is validated by `parseMixId` inside `selectMix`, which is
 * also where an unknown seed becomes a 404 rather than a query.
 */
const paramsSchema = z.object({ id: z.string().min(3).max(200) })

/**
 * One mix, rebuilt on every request from its id.
 *
 * Reading never requires auth — signed out you get the same mix ranked without
 * the follow term, so a shared mix link opens for a first-time visitor.
 */
export default defineEventHandler(async (event): Promise<MixDetail> => {
  const parsed = paramsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid mix' })
  }

  const user = await getSessionUser(event)
  const mix = await selectMix(parsed.data.id, user?.id ?? null)
  if (!mix) {
    throw createError({ statusCode: 404, statusMessage: 'That mix is not available' })
  }

  return mix
})
