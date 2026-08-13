import type { RelatedItem } from './watch'

/**
 * Wire shapes for the watch-page AI assistant (ADR-029).
 *
 * One thing to hold on to while reading these: **the model never sees the
 * video**. Gemini's video understanding takes a file uploaded through the
 * Files API or a YouTube URL, and this app's sources are arbitrary mp4/HLS
 * URLs. Everything below is therefore grounded in the *metadata* we hold —
 * title, channel, category, description, duration, view count — plus the real
 * catalogue rows the recommender picks from. `basis` on `WatchInsights` says
 * which of those the model actually had, so the UI can be honest about it
 * rather than implying the assistant watched along with you.
 */

/**
 * Whether the configured model bills per token. Derived from the model id
 * against a known-free list, defaulting to `pro` for anything unrecognised —
 * an unknown model is assumed to cost money, not assumed to be free.
 */
export type AiTier = 'free' | 'pro'

/** What `/api/ai/config` reports so the client can render the right state. */
export interface AiConfig {
  /** False when `GEMINI_API_KEY` is unset — the panel says so instead of failing. */
  enabled: boolean
  /** The model id in use, e.g. `gemini-3.5-flash`. Shown in the panel footer. */
  model: string
  tier: AiTier
}

/** One thing the video is about, per the description. */
export interface AiTopic {
  label: string
  detail: string
}

/**
 * The always-on half of the panel: what this video looks like from its
 * metadata, plus openers for the ask box. Cached per slug — it doesn't depend
 * on who's watching.
 */
export interface WatchInsights {
  /** Two sentences at most, in the viewer's second person. */
  summary: string
  topics: AiTopic[]
  /** One-tap questions. Rendered as buttons that prefill the composer. */
  suggestions: string[]
  /**
   * What the summary was actually built from. `title-only` when the clip has
   * no description, which the UI surfaces as a weaker claim.
   */
  basis: 'description' | 'title-only'
}

/** A conversation turn as the client stores and replays it. */
export interface AiTurn {
  role: 'user' | 'assistant'
  text: string
}

/** What the ask box sends. */
export interface AiAskRequest {
  question: string
  /** Prior turns, oldest first. Trimmed server-side — see `MAX_HISTORY_TURNS`. */
  history?: AiTurn[]
  /** Playhead position in seconds, so "what's happening here" has a referent. */
  atSeconds?: number
}

export interface AiAnswer {
  answer: string
  /** Follow-ups the model proposes. Same treatment as `suggestions`. */
  followUps: string[]
}

/**
 * One AI-ranked recommendation. It is a real `RelatedItem` off the catalogue
 * with a reason attached — the model is handed the candidate list and may only
 * choose from it. Ids it invents are dropped rather than rendered as a video
 * that doesn't exist (CLAUDE.md §2).
 */
export interface AiPick extends RelatedItem {
  reason: string
}
