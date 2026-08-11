import { z } from 'zod'
import { removeFeedFeedback } from '../../utils/feedback'
import { requireUser } from '../../utils/session'
import { HOME_FEEDBACK_KINDS } from '#shared/types/home'
import type { HomeFeedback } from '#shared/types/home'

const querySchema = z.object({
  kind: z.enum(HOME_FEEDBACK_KINDS),
  target: z.string().trim().min(1).max(200)
})

/**
 * Undo one piece of feed feedback — the "Undo" action on the toast, and the
 * only way back once a card is hidden.
 *
 * Read from the query string rather than a body: a DELETE body is legal but not
 * reliably forwarded by proxies, and neither field is sensitive. Deleting
 * something that isn't there succeeds, so a double-tapped Undo is not an error.
 */
export default defineEventHandler(async (event): Promise<HomeFeedback> => {
  const user = await requireUser(event)

  const query = querySchema.safeParse(getQuery(event))
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feedback' })
  }

  return await removeFeedFeedback(user.id, query.data)
})
