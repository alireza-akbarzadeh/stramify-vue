import { clearHistory } from '../../utils/history'
import { requireUser } from '../../utils/session'

/**
 * "Clear all watch history" — drops every saved position for the caller.
 *
 * `requireUser`, not `getSessionUser`: reads answer emptily when signed out,
 * but a destructive write with no session is a 401, not a no-op that reports
 * success. The scope is the session's own id, so there is no way to spell a
 * request that clears somebody else's history.
 *
 * Deleting the rows rather than flagging them hidden — this is the viewer
 * asking to be forgotten, and a "deleted" column that still holds where they
 * stopped watching is not that. The cost is that Continue-watching empties too,
 * which is the expected consequence and is spelled out in the confirm dialog.
 *
 * Idempotent: clearing an already-empty history returns 200 with `removed: 0`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const removed = await clearHistory(user.id)
  return { removed }
})
