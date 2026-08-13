import { z } from 'zod'
import type { WatchTarget } from '#shared/types/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * The thing being watched — a clip or a live channel, resolved from one slug.
 * 404 is a real state the page renders ("this video isn't available"), not an
 * error to swallow.
 *
 * The session is read for one reason: a creator previewing their own private
 * upload. This is the only watch endpoint that passes a viewer, so a private
 * clip renders its page for its owner while every side channel around it —
 * comments, reactions, related — still resolves to nothing for everyone,
 * including them.
 */
export default defineEventHandler(async (event): Promise<WatchTarget> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const viewer = await getSessionUser(event)
  const resolved = await resolveWatchTarget(parsed.data.slug, viewer?.id ?? null)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  return resolved.target
})
