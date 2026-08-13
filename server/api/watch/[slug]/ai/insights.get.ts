import { z } from 'zod'
import { generateJson, requireGemini } from '../../../../utils/gemini'
import type { GeminiSettings } from '../../../../utils/gemini'
import { createRateLimiter, enforceRateLimit, rateLimitKey } from '../../../../utils/rate-limit'
import { getSessionUser } from '../../../../utils/session'
import { resolveWatchTarget } from '../../../../utils/watch'
import {
  insightsBasis,
  insightsPrompt,
  insightsResponseSchema,
  insightsSchema
} from '../../../../utils/watch-ai'
import type { WatchInsights } from '#shared/types/ai'
import type { WatchTarget } from '#shared/types/watch'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

/**
 * Generous, because a cache hit costs nothing and this is the request every
 * watch page makes on load. It only bites on someone walking the catalogue
 * faster than a person watches videos.
 */
const limiter = createRateLimiter({ limit: 40, windowMs: 10 * 60 * 1000 })

/**
 * Six hours. The inputs — title, description, category — change roughly never,
 * so the only thing a shorter TTL would buy is a bigger Gemini bill. Keyed by
 * model as well as slug so switching `GEMINI_MODEL` doesn't serve answers from
 * the old one.
 */
const cachedInsights = defineCachedFunction(
  async (target: WatchTarget, settings: GeminiSettings) => {
    const result = await generateJson(
      settings,
      insightsPrompt(target),
      insightsSchema,
      insightsResponseSchema
    )
    return { ...result, basis: insightsBasis(target) } satisfies WatchInsights
  },
  {
    name: 'watch-ai-insights',
    maxAge: 60 * 60 * 6,
    getKey: (target: WatchTarget, settings: GeminiSettings) => `${settings.model}:${target.slug}`
  }
)

/**
 * What this video looks like from its listing, plus openers for the ask box.
 *
 * Anonymous-readable: it says nothing a signed-out viewer can't already read
 * off the page, and gating it would mean the panel is dead weight for exactly
 * the people deciding whether to sign up. Asking a *question* is the gated
 * action (`ask.post.ts`) — that one spends quota per call and can't be cached.
 */
export default defineEventHandler(async (event): Promise<WatchInsights> => {
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

  return cachedInsights(resolved.target, settings)
})
