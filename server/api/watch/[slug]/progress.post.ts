import { z } from 'zod'
import { upsertWatchProgress } from '../../../utils/progress'
import { requireUser } from '../../../utils/session'
import { resolveWatchTarget } from '../../../utils/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * The position is bounded, not merely non-negative: it's whatever the player
 * reports, and a player reports whatever the page tells it to. The runtime
 * isn't accepted from the client at all — it comes off the clip row below.
 */
const DAY_SECONDS = 86_400

const bodySchema = z.object({
  positionSeconds: z.number().int().min(0).max(DAY_SECONDS),
  completed: z.boolean().default(false)
})

/**
 * Save the viewer's position in a clip — the write behind "Continue watching".
 *
 * Signed in only, because the row is keyed to an account; signed out the client
 * never calls this (see `useWatchProgress`), and a 401 here is the honest
 * answer rather than silently discarding the write.
 *
 * Live streams are a deliberate no-op with a 200, not a 400. There's no resume
 * point on a live edge, and the player has no way to know which kind it's
 * playing before it starts — making it an error would mean every live session
 * logging failed requests for something working exactly as intended.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid playback position' })
  }

  const user = await requireUser(event)
  const resolved = await resolveWatchTarget(params.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }
  if (resolved.kind !== 'clip') return { saved: false }

  // Clamped to the clip's real runtime, which is also what gets stored as the
  // denominator — a player that over-reports can't leave a bar stuck past 100%.
  await upsertWatchProgress(
    user.id,
    resolved.row.id,
    {
      positionSeconds: Math.min(body.data.positionSeconds, resolved.row.durationSeconds),
      completed: body.data.completed
    },
    resolved.row.durationSeconds
  )

  return { saved: true }
})
