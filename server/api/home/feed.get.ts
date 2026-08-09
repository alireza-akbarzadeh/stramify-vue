import { z } from 'zod'
import { CLIP_CATEGORIES, toCategorySlug } from '#shared/utils/category'
import { HOME_PAGE_SIZE } from '#shared/types/home'
import type { HomeFeedPage } from '#shared/types/home'
import type { CategorySlug } from '#shared/types/discovery'

/**
 * Category slugs as a closed set, so an unknown chip is a 400 rather than a
 * filter that silently matches nothing.
 */
const categorySlugs = CLIP_CATEGORIES.map(toCategorySlug) as [CategorySlug, ...CategorySlug[]]

const querySchema = z.object({
  category: z.enum(categorySlugs).optional(),
  // Spelled out rather than `z.coerce.boolean()`, which treats any non-empty
  // string as true — including `?live=false`.
  live: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  cursor: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(HOME_PAGE_SIZE)
})

/**
 * The home page's recommended feed — ranked across VODs and live sessions.
 *
 * Personalised when there's a session and identical for everyone when there
 * isn't: signed out you get the popularity ranking, signed in your follows
 * weigh on it (see `selectHomeFeed` for the score). Reading it never requires
 * auth, so a first-time visitor lands on a full page, not a login wall.
 */
export default defineEventHandler(async (event): Promise<HomeFeedPage> => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feed filter' })
  }

  const user = await getSessionUser(event)
  const { category, live, cursor, limit } = parsed.data

  return await selectHomeFeed({
    category: category ?? null,
    liveOnly: live,
    cursor,
    limit,
    userId: user?.id ?? null
  })
})
