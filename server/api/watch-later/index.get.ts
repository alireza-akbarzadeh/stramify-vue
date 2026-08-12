import { z } from 'zod'
import { getSessionUser } from '../../utils/session'
import { selectWatchLater } from '../../utils/watch-later'
import { WATCH_LATER_MAX_LIMIT } from '#shared/types/library'
import type { WatchLaterItem } from '#shared/types/library'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(WATCH_LATER_MAX_LIMIT).default(WATCH_LATER_MAX_LIMIT)
})

/**
 * The viewer's Watch later queue, most recently saved first.
 *
 * `[]` rather than a 401 when signed out, matching `/api/home/continue`,
 * `/api/playlists` and `/api/history`: "nothing saved" is the honest answer for
 * a visitor with no account, and it lets each surface render its own empty or
 * sign-in state instead of an error.
 *
 * `?limit=` exists so the home rail can ask for its ten without the page's
 * full screenful — one endpoint, two callers, rather than a second route that
 * differs only in a number. Scoping is the session's, never the query string's.
 */
export default defineEventHandler(async (event): Promise<WatchLaterItem[]> => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch later request' })
  }

  const user = await getSessionUser(event)
  if (!user) return []

  return await selectWatchLater(user.id, parsed.data.limit)
})
