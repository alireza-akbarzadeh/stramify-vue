import { z } from 'zod'
import { selectHistory } from '../../utils/history'
import { getSessionUser } from '../../utils/session'
import { HISTORY_PAGE_SIZE, HISTORY_QUERY_MAX } from '#shared/types/history'
import type { HistoryPage } from '#shared/types/history'

const querySchema = z.object({
  q: z.string().max(HISTORY_QUERY_MAX).default(''),
  cursor: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(60).default(HISTORY_PAGE_SIZE)
})

/**
 * What this viewer has watched, newest first, optionally filtered by a term.
 *
 * Returns an empty page rather than a 401 when signed out, matching
 * `/api/home/continue` and `/api/following/channels`: "nothing watched" is the
 * honest answer for a visitor with no account, and it lets the page render its
 * sign-in prompt as an empty state instead of an error.
 *
 * Scoping is the session's, never the query string's — there is deliberately no
 * `userId` parameter to tamper with.
 */
export default defineEventHandler(async (event): Promise<HistoryPage> => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid history filter' })
  }

  const user = await getSessionUser(event)
  if (!user) return { items: [], nextCursor: null }

  const { q, cursor, limit } = parsed.data
  return await selectHistory({ userId: user.id, cursor, limit, search: q })
})
