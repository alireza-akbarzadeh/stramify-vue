import type { H3Event } from 'h3'
import type { z } from 'zod'
import { logger } from './logger'
import type { AiTier } from '#shared/types/ai'

/**
 * Gemini transport. Two functions — text in, text out, and text in, validated
 * JSON out — over the `generateContent` REST endpoint.
 *
 * Deliberately not `@google/genai` (ADR-029): every call this app makes is a
 * POST with a JSON body and an API-key header, and the SDK would add a
 * dependency plus its own auth and retry behaviour for no gain. The trade
 * flips the day we need streaming, the Files API or context caching — at
 * which point swapping the two functions below is the whole migration.
 *
 * The key never leaves the server: `runtimeConfig.gemini` sits outside
 * `public`, so it is not in the client bundle and the browser only ever talks
 * to our own `/api/watch/[slug]/ai/*` routes.
 */
const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Free-tier default. `gemini-2.5-flash` rather than the newer
 * `gemini-3.5-flash`, which is also free but was returning Google's "currently
 * experiencing high demand" 503 on every call when this was built — the newest
 * flash model shares free-tier capacity with everyone who wants to try it, and
 * a default that is usually busy is not a default. 2.5 is a generation older,
 * amply provisioned, and more than enough to summarise a paragraph of metadata.
 *
 * Override with `GEMINI_MODEL` for either direction: `gemini-3.5-flash` when it
 * has capacity, or `gemini-2.5-pro` to move to a paid model — that upgrade
 * needs no code change, only the env var and billing enabled on the key.
 */
const DEFAULT_MODEL = 'gemini-2.5-flash'

/**
 * Models that bill nothing on the standard tier. Anything *not* listed is
 * treated as paid: guessing "free" for an unrecognised id is the expensive
 * mistake, guessing "pro" only mislabels a badge.
 */
const FREE_TIER_MODELS = new Set([
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
])

/**
 * Long enough for a flash model's few-hundred-token answer, short enough that
 * a hung upstream doesn't pin a Nitro worker. The client shows its own error
 * state well before a browser would give up.
 */
const REQUEST_TIMEOUT_MS = 20_000

export interface GeminiSettings {
  apiKey: string
  model: string
  tier: AiTier
}

/** Model id → billing tier. Exported for `/api/ai/config` and its test. */
export function modelTier(model: string): AiTier {
  return FREE_TIER_MODELS.has(model) ? 'free' : 'pro'
}

/**
 * Resolved Gemini settings, or `null` when no key is configured.
 *
 * `null` is a first-class state, not a failure: the app runs perfectly well
 * without an AI key (this is an enhancement to the watch page, not a
 * dependency of it), and the panel renders a "not configured" card instead of
 * an error.
 */
export function geminiSettings(event?: H3Event): GeminiSettings | null {
  const { gemini } = useRuntimeConfig(event)
  const apiKey = gemini?.apiKey?.trim()
  if (!apiKey) return null

  const model = gemini.model?.trim() || DEFAULT_MODEL
  return { apiKey, model, tier: modelTier(model) }
}

/** Settings, or a 503 — for the routes that can't do anything without them. */
export function requireGemini(event: H3Event): GeminiSettings {
  const settings = geminiSettings(event)
  if (!settings) {
    throw createError({
      statusCode: 503,
      statusMessage: 'The AI assistant is not configured on this server'
    })
  }
  return settings
}

export interface GeminiPrompt {
  /** Persona and rules. Sent as `systemInstruction`, not as a first user turn. */
  system: string
  /** The current question or task. */
  prompt: string
  /** Prior turns, oldest first. */
  history?: { role: 'user' | 'model'; text: string }[]
  temperature?: number
  maxOutputTokens?: number
}

interface GeminiResponseBody {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    finishReason?: string
  }[]
  promptFeedback?: { blockReason?: string }
}

/**
 * POST one completion and return the concatenated text parts.
 *
 * Upstream failures are re-thrown as our own status codes so the client sees a
 * stable contract: 429 stays 429 (the free tier's per-minute quota is a normal
 * thing to hit and the UI says "try again in a moment"), a timeout becomes 504,
 * and everything else becomes 502 — a Gemini 400 is our bug, not the caller's,
 * so it must not surface as a 400 that blames the viewer's question.
 */
async function generate(
  settings: GeminiSettings,
  { system, prompt, history = [], temperature = 0.4, maxOutputTokens = 800 }: GeminiPrompt,
  responseSchema?: Record<string, unknown>
): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [
      ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: 'user' as const, parts: [{ text: prompt }] }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(responseSchema ? { responseMimeType: 'application/json', responseSchema } : {})
    }
  }

  let response: GeminiResponseBody
  try {
    response = await $fetch<GeminiResponseBody>(`${API_ROOT}/${settings.model}:generateContent`, {
      method: 'POST',
      // Header rather than `?key=` — a query string ends up in access logs and
      // proxy caches, and this one is a credential.
      headers: { 'x-goog-api-key': settings.apiKey },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    throw toGeminiError(error)
  }

  if (response.promptFeedback?.blockReason) {
    throw createError({
      statusCode: 422,
      statusMessage: "That question was blocked by the model's safety filters"
    })
  }

  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw createError({ statusCode: 502, statusMessage: 'The AI assistant returned nothing' })
  }
  return text
}

/**
 * Map an upstream failure onto our own status codes — and log the real one
 * first.
 *
 * The logging is not incidental. The messages below are deliberately vague
 * because they are read by viewers, and without this line a wrong model id, a
 * key with the API disabled, and a malformed request all surface identically as
 * "unavailable" with nothing to go on. Gemini puts the actual cause in
 * `data.error.message` ("models/x is not found", "API key not valid"), so that
 * is what gets logged, at `error` level, server-side only.
 */
function toGeminiError(error: unknown): ReturnType<typeof createError> {
  const status = (error as { status?: number; statusCode?: number })?.status ?? 0
  const body = (error as { data?: unknown })?.data
  const structured = (body as { error?: { message?: string; status?: string } } | undefined)?.error

  /**
   * Google's JSON errors carry the cause in `data.error.message`, but the
   * response is not always Google's — a corporate proxy or a sandboxed egress
   * returns an HTML block page with its own status, and reading `.error` off a
   * string yields `undefined`, which logs an empty line and looks like the API
   * said nothing. So the fallback stringifies whatever did arrive, truncated:
   * "<!DOCTYPE html>…" in the log is itself the answer.
   */
  const upstream =
    structured?.message ??
    (typeof body === 'string' ? body.slice(0, 200) : body ? JSON.stringify(body).slice(0, 200) : undefined)

  logger.error({ status, upstream, reason: structured?.status }, 'Gemini request failed')

  /**
   * In dev the upstream message rides along in `data` as well, so the cause is
   * visible in the network tab without tailing the server. Google's message
   * names the problem ("models/x is not found", "API key not valid") and never
   * echoes the key. Stripped in production, where the viewer gets the plain
   * sentence and the detail stays in the log.
   */
  const detail = import.meta.dev && upstream ? { data: { upstream } } : {}

  if (status === 429) {
    return createError({
      statusCode: 429,
      statusMessage: 'The AI assistant is over its quota — try again shortly',
      ...detail
    })
  }
  /**
   * 503 from Google means the *model* is saturated, not that anything here is
   * wrong — the free tier shares capacity and the newest flash models get busy.
   * Worth its own message: "busy right now" tells someone to press the button
   * again, where "unavailable" reads as broken and sends them to check a key
   * that is fine. Passed straight through as a 503 so the client can tell the
   * two apart without parsing prose.
   */
  if (status === 503) {
    return createError({
      statusCode: 503,
      statusMessage: 'The model is busy right now — try again in a moment',
      ...detail
    })
  }
  if ((error as { name?: string })?.name === 'TimeoutError') {
    return createError({ statusCode: 504, statusMessage: 'The AI assistant took too long' })
  }
  return createError({
    statusCode: 502,
    statusMessage: 'The AI assistant is unavailable',
    ...detail
  })
}

/** Free-text completion. */
export function generateText(settings: GeminiSettings, prompt: GeminiPrompt): Promise<string> {
  return generate(settings, prompt)
}

/**
 * Structured completion, parsed and validated before it leaves this module.
 *
 * `responseSchema` makes Gemini emit JSON matching the shape, but "makes" is
 * doing optimistic work there — a truncated response or a model that ignores
 * one field still has to fail somewhere, and failing here means every caller
 * downstream can trust its types. A schema violation is a 502: the upstream
 * gave us something unusable, which is not the viewer's problem.
 */
export async function generateJson<T>(
  settings: GeminiSettings,
  prompt: GeminiPrompt,
  schema: z.ZodType<T>,
  responseSchema: Record<string, unknown>
): Promise<T> {
  const raw = await generate(settings, prompt, responseSchema)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'The AI assistant returned invalid JSON' })
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw createError({
      statusCode: 502,
      statusMessage: 'The AI assistant returned an unexpected shape'
    })
  }
  return result.data
}
