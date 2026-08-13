import { z } from 'zod'
import { generateJson, requireGemini } from '../../../../utils/gemini'
import type { GeminiSettings } from '../../../../utils/gemini'
import { createRateLimiter, enforceRateLimit, rateLimitKey } from '../../../../utils/rate-limit'
import { getSessionUser } from '../../../../utils/session'
import { resolveWatchTarget, selectRelated } from '../../../../utils/watch'
import { groundPicks, picksPrompt, picksResponseSchema, picksSchema } from '../../../../utils/watch-ai'
import type { AiPick } from '#shared/types/ai'
import type { RelatedItem, WatchTarget } from '#shared/types/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/** Wider than the rail's 12 — the model needs room to choose, not just to sort. */
const CANDIDATE_LIMIT = 24

const limiter = createRateLimiter({ limit: 40, windowMs: 10 * 60 * 1000 })

/**
 * Only the model's *choice* is cached — a list of `{ id, reason }` — never the
 * rendered videos.
 *
 * That distinction is the whole point: candidates are re-queried on every
 * request and `groundPicks` re-joins them, so a clip pulled from the catalogue
 * disappears from the panel immediately instead of sitting in a cache for two
 * hours as a card that 404s when clicked. The cost of that is one indexed
 * query per request, which we were paying for the rail anyway.
 *
 * Two hours rather than the six insights gets: the reasons are stable, but the
 * catalogue they were chosen from is not, and a stale choice quietly stops
 * surfacing anything published since.
 */
const cachedPickIds = defineCachedFunction(
  async (target: WatchTarget, candidates: RelatedItem[], settings: GeminiSettings) => {
    const { picks } = await generateJson(
      settings,
      picksPrompt(target, candidates),
      picksSchema,
      picksResponseSchema
    )
    return picks
  },
  {
    name: 'watch-ai-picks',
    maxAge: 60 * 60 * 2,
    getKey: (target: WatchTarget, _candidates: RelatedItem[], settings: GeminiSettings) =>
      `${settings.model}:${target.slug}`
  }
)

/**
 * "More like this", ranked by the model over real catalogue rows.
 *
 * Returns `[]` rather than an error when there's nothing in the category to
 * rank, or when the model returned only ids that don't exist — the panel hides
 * itself and the ordinary up-next rail is still right there. An empty section
 * headed "AI picks" would be worse than no section.
 */
export default defineEventHandler(async (event): Promise<AiPick[]> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const settings = requireGemini(event)
  const user = await getSessionUser(event)
  enforceRateLimit(event, limiter, rateLimitKey(event, user?.id))

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  const candidates = await selectRelated(resolved, CANDIDATE_LIMIT)
  if (!candidates.length) return []

  const picks = await cachedPickIds(resolved.target, candidates, settings)
  return groundPicks(candidates, picks)
})
