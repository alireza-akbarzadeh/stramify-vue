import { z } from 'zod'
import { selectLiked } from '../../utils/liked'
import { getSessionUser } from '../../utils/session'
import { LIKED_PAGE_SIZE, LIKED_QUERY_MAX, LIKED_SORTS } from '#shared/types/library'
import type { LikedPage } from '#shared/types/library'

const querySchema = z.object({
  q: z.string().max(LIKED_QUERY_MAX).default(''),
  sort: z.enum(LIKED_SORTS).default('recent'),
  cursor: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(60).default(LIKED_PAGE_SIZE)
})

/**
 * The clips this viewer has liked, optionally filtered and reordered.
 *
 * Returns an empty page rather than a 401 when signed out, matching `/api/
 * history`, `/api/watch-later` and `/api/playlists`: "you haven't liked
 * anything" is the honest answer for a visitor with no account, and it lets the
 * page render its own sign-in prompt as an empty state instead of an error.
 *
 * Scoping is the session's, never the query string's — there is deliberately no
 * `userId` parameter to tamper with. `sort` is validated against the same
 * `LIKED_SORTS` tuple the UI's menu is built from, so an unknown value is a 400
 * rather than a silent fallback that quietly ignores what was asked for.
 */
export default defineEventHandler(async (event): Promise<LikedPage> => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid liked videos filter' })
  }

  const user = await getSessionUser(event)
  if (!user) return { items: [], nextCursor: null }

  const { q, sort, cursor, limit } = parsed.data
  return await selectLiked({ userId: user.id, cursor, limit, search: q, sort })
})
