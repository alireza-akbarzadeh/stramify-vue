import { z } from 'zod'
import { addFeedFeedback } from '../../utils/feedback'
import { requireUser } from '../../utils/session'
import { HOME_FEEDBACK_KINDS } from '#shared/types/home'
import type { HomeFeedback } from '#shared/types/home'

const bodySchema = z.object({
  kind: z.enum(HOME_FEEDBACK_KINDS),
  target: z.string().trim().min(1).max(200)
})

/**
 * "Not interested" / "Don't recommend this channel" from a home card's menu.
 *
 * Signed-in only: the suppression is a row keyed by user, so there is nowhere
 * to put a visitor's answer. The UI says so before it gets here, but the check
 * is server-side because that's where authorization lives (CLAUDE.md §5).
 *
 * Returns the canonical stored row rather than 204 — the client's Undo sends it
 * straight back to the DELETE, so it never has to re-derive a channel handle
 * from whatever casing the card was rendered with.
 */
export default defineEventHandler(async (event): Promise<HomeFeedback> => {
  const user = await requireUser(event)

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feedback' })
  }

  return await addFeedFeedback(user.id, body.data)
})
