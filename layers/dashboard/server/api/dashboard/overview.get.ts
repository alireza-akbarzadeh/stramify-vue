import { requireUser } from '~~/server/utils/session'
import { readDashboardOverview } from '~~/server/utils/dashboard'
import type { DashboardOverview } from '#shared/types/dashboard'

/**
 * Everything the dashboard landing page needs, in one round trip.
 *
 * Auth-gated rather than optional: two of the three sections are scoped to
 * the signed-in user, and the third (platform pulse) isn't worth a public
 * endpoint of its own. The `auth` middleware already guards the page — this
 * is the server-side half of that check (CLAUDE.md §5).
 */
export default defineEventHandler(async (event): Promise<DashboardOverview> => {
  const user = await requireUser(event)
  return readDashboardOverview(user)
})
