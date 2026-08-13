import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { AiAnswer, AiConfig, AiPick, AiTurn, WatchInsights } from '#shared/types/ai'

/**
 * Client half of the watch-page AI assistant (ADR-029).
 *
 * Three server queries and one mutation. The conversation itself is *not* a
 * query — it's local state replayed to the server on each ask, because a thread
 * belongs to one open tab on one video and there is nothing to persist it to
 * (see `ask.post.ts` for why keeping it would be a liability rather than a
 * feature).
 */

/** Turns of history sent back up. Matches `MAX_HISTORY_TURNS` on the server. */
const HISTORY_SENT = 8

/**
 * Is the assistant switched on for this deployment, and on which model.
 *
 * `staleTime: Infinity` — this answers a question about the server process, not
 * about anything the viewer can change, so refetching it on every watch page
 * would be pure noise. `retry: false` because a failure here means the same
 * thing as `enabled: false` and the panel should say so immediately.
 */
export function useAiConfig() {
  return useQuery({
    queryKey: ['ai', 'config'],
    queryFn: () => $fetch<AiConfig>('/api/ai/config'),
    staleTime: Infinity,
    retry: false
  })
}

/**
 * Metadata-grounded summary, topics and opening questions.
 *
 * `enabled` is threaded through from the config query so a deployment with no
 * key never fires this — otherwise every watch page would spend a round trip
 * collecting a 503.
 */
export function useWatchInsights(slug: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  const key = computed(() => toValue(slug))
  return useQuery({
    queryKey: ['watch', 'ai', 'insights', key],
    queryFn: () => $fetch<WatchInsights>(`/api/watch/${encodeURIComponent(key.value)}/ai/insights`),
    enabled: computed(() => !!key.value && toValue(enabled)),
    // Server-cached for six hours; there is nothing to gain from asking again
    // inside one session.
    staleTime: 30 * 60 * 1000,
    retry: false
  })
}

/** AI-ranked "more like this", already joined back to real catalogue rows. */
export function useWatchAiPicks(slug: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  const key = computed(() => toValue(slug))
  return useQuery({
    queryKey: ['watch', 'ai', 'picks', key],
    queryFn: () => $fetch<AiPick[]>(`/api/watch/${encodeURIComponent(key.value)}/ai/picks`),
    enabled: computed(() => !!key.value && toValue(enabled)),
    staleTime: 30 * 60 * 1000,
    retry: false
  })
}

/**
 * A readable line for the panel's error state.
 *
 * The server's `statusMessage` is written for exactly this — "over its quota",
 * "not configured", "took too long" — so prefer it over a generic string and
 * fall back only when something threw that isn't ours.
 */
export function aiErrorMessage(error: unknown): string {
  const message = (error as { statusMessage?: string; data?: { statusMessage?: string } } | null)
  return (
    message?.data?.statusMessage ||
    message?.statusMessage ||
    "The assistant couldn't answer that. Try again in a moment."
  )
}

export interface WatchAskOptions {
  /** Current playhead, read at send time so the question carries its own timestamp. */
  atSeconds?: () => number | undefined
}

/**
 * The ask box.
 *
 * `turns` holds *answered* exchanges only, and the question in flight lives in
 * `pendingQuestion` beside it. Keeping the two apart is what makes a failed ask
 * recoverable: nothing half-finished ever enters the history that gets replayed
 * to the model, so a retry sends the same context the first attempt did.
 */
export function useWatchAsk(slug: MaybeRefOrGetter<string>, options: WatchAskOptions = {}) {
  const key = computed(() => toValue(slug))
  const turns = ref<AiTurn[]>([])
  const followUps = ref<string[]>([])
  const pendingQuestion = ref<string | null>(null)

  const ask = useMutation({
    mutationFn: (question: string) =>
      $fetch<AiAnswer>(`/api/watch/${encodeURIComponent(key.value)}/ai/ask`, {
        method: 'POST',
        body: {
          question,
          history: turns.value.slice(-HISTORY_SENT),
          atSeconds: options.atSeconds?.()
        }
      }),
    onMutate: (question: string) => {
      pendingQuestion.value = question
      followUps.value = []
    },
    onSuccess: (answer, question) => {
      turns.value = [
        ...turns.value,
        { role: 'user', text: question },
        { role: 'assistant', text: answer.answer }
      ]
      followUps.value = answer.followUps
      pendingQuestion.value = null
    },
    onError: () => {
      pendingQuestion.value = null
    }
  })

  function reset() {
    turns.value = []
    followUps.value = []
    pendingQuestion.value = null
    ask.reset()
  }

  /**
   * A new video is a new conversation. Without this, walking from one watch
   * page to the next would carry the last video's thread into a prompt about a
   * different one — the model would answer confidently about the wrong thing.
   */
  watch(key, reset)

  return { turns, followUps, pendingQuestion, ask, reset }
}
