import type { HomeVideo } from '#shared/types/home'

/**
 * The "Latest from channels you follow" rail.
 *
 * Returns `[]` rather than a 401 when signed out. It's a read-only
 * personalisation surface, and an empty list is the honest answer to "what's
 * new from your channels" for someone with no channels — the UI renders
 * nothing at all in that case instead of an empty shelf.
 */
export default defineEventHandler(async (event): Promise<HomeVideo[]> => {
  const user = await getSessionUser(event)
  return await selectFollowingFeed(user?.id ?? null)
})
