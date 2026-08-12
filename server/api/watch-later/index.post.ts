import { z } from 'zod'
import { requireUser } from '../../utils/session'
import { addToWatchLater } from '../../utils/watch-later'

const bodySchema = z.object({ clipId: z.string().min(1).max(200) })

/**
 * Save a clip to Watch later.
 *
 * `requireUser`, not `getSessionUser`: unlike the reads, there is nowhere to
 * put a save without an account, and answering 200 to a write that stored
 * nothing would be the kind of quiet lie CLAUDE.md rule 2 forbids.
 *
 * Idempotent — saving something already in the queue returns `saved: true`,
 * because that *is* the state the caller asked for. The menu fires this without
 * knowing whether the video is already saved, so a conflict here would be an
 * error for a request that did no harm.
 */
export default defineEventHandler(async (event) => {
  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch later request' })
  }

  const user = await requireUser(event)
  if (!(await addToWatchLater(user.id, body.data.clipId))) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return { saved: true }
})
