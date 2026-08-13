import { z } from 'zod'
import { generateJson, requireGemini } from '../../../../utils/gemini'
import { createRateLimiter, enforceRateLimit, rateLimitKey } from '../../../../utils/rate-limit'
import { requireUser } from '../../../../utils/session'
import { resolveWatchTarget, selectRelated } from '../../../../utils/watch'
import {
  MAX_HISTORY_TURNS,
  MAX_QUESTION_LENGTH,
  answerResponseSchema,
  answerSchema,
  askPrompt
} from '../../../../utils/watch-ai'
import type { AiAnswer } from '#shared/types/ai'

const paramsSchema = z.object({ slug: z.string().min(1).max(200) })

const bodySchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  /**
   * Replayed by the client rather than stored server-side — a thread lives and
   * dies with the open tab, and keeping a log of what people asked about what
   * they watched would be a privacy liability with no product behind it.
   * Bounded here because the client is not to be trusted with the token bill.
   */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().trim().min(1).max(MAX_QUESTION_LENGTH * 4)
      })
    )
    .max(MAX_HISTORY_TURNS * 2)
    .optional(),
  /** Playhead in seconds, so "what's this bit" has something to anchor to. */
  atSeconds: z.number().finite().min(0).max(60 * 60 * 24).optional()
})

/** How many catalogue rows the answer may point at. Enough to suggest, not to list. */
const RELATED_CONTEXT = 10

/**
 * Twenty questions per ten minutes. High enough that nobody having a real
 * conversation notices, low enough that a stuck retry loop can't drain the
 * day's free-tier quota before anyone sees the graph.
 */
const limiter = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 })

/**
 * Ask the assistant about the video on screen.
 *
 * Sign-in required, matching every other thing on this page that costs the
 * platform something to accept — comments, chat, reactions. Here the cost is a
 * metered model call that can't be cached (each question is different), so an
 * anonymous route would be a public quota drain. `requireUser` is what enforces
 * it; the composer's logged-out state is a courtesy, not the control
 * (CLAUDE.md §5).
 *
 * The answer is grounded twice over: the prompt carries this video's metadata
 * and the real candidate rows around it, and `watch-ai.ts` tells the model in
 * as many words that it has not watched anything. See docs/ai-assistant.md for
 * why that caveat is structural rather than cautious.
 */
export default defineEventHandler(async (event): Promise<AiAnswer> => {
  const parsed = paramsSchema.safeParse({ slug: getRouterParam(event, 'slug') })
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid watch slug' })
  }

  const settings = requireGemini(event)
  const user = await requireUser(event)

  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `A question must be 1–${MAX_QUESTION_LENGTH} characters`
    })
  }

  enforceRateLimit(event, limiter, rateLimitKey(event, user.id))

  const resolved = await resolveWatchTarget(parsed.data.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'That video is not available' })
  }

  const related = await selectRelated(resolved, RELATED_CONTEXT)

  return generateJson(
    settings,
    askPrompt(resolved.target, body.data.question, {
      history: body.data.history,
      atSeconds: body.data.atSeconds,
      related
    }),
    answerSchema,
    answerResponseSchema
  )
})
