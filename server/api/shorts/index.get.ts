import { z } from 'zod'
import { selectShortsPage } from '../../utils/shorts'
import { getSessionUser } from '../../utils/session'
import { SHORTS_PAGE_SIZE } from '#shared/types/shorts'
import type { ShortsPage } from '#shared/types/shorts'

const querySchema = z.object({
  cursor: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(20).default(SHORTS_PAGE_SIZE),
  /**
   * `?v=<clip id>` from a shared link. Bounded like every other slug we take
   * from a URL; an id that matches nothing simply doesn't pin anything, which
   * is a better answer than a 404 on the whole feed.
   */
  start: z.string().min(1).max(200).optional()
})

/**
 * The vertical feed behind `/shorts`.
 *
 * Reading never requires auth — signed out you get the same shorts with empty
 * engagement state, so a shared link opens and plays for a first-time visitor
 * rather than hitting a login wall. Signing in only adds *your* like and
 * follow state to the same rows.
 */
export default defineEventHandler(async (event): Promise<ShortsPage> => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid shorts page request' })
  }

  const user = await getSessionUser(event)
  const { cursor, limit, start } = parsed.data

  return selectShortsPage({ cursor, limit, startId: start ?? null, userId: user?.id ?? null })
})
