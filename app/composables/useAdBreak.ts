import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { AdBreak, AdBreakResponse } from '#shared/types/ads'

/**
 * The pre-roll for the video being watched, if there is one.
 *
 * Nothing here decides *whether* to show an ad — that is `server/utils/ads.ts`,
 * and it decides by not sending a payload. An entitled viewer's response is
 * `{ ad: null }` with no creative in it at all, so there is nothing for this
 * composable, the devtools network tab, or a modified client to reveal. All the
 * client does is play what it was given.
 *
 * `watched` is deliberately local and per-mount rather than persisted. A viewer
 * who reloads the page sees a pre-roll again, which matches every ad-funded
 * player; remembering it would need a server-side impression record to mean
 * anything, and a `localStorage` flag would just be an ad-skip button with
 * extra steps.
 */
export function useAdBreak(slug: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  const key = computed(() => toValue(slug))
  const active = computed(() => !!key.value && toValue(enabled))

  const watched = ref(false)

  const query = useQuery({
    queryKey: ['watch', 'ad', key],
    queryFn: () => $fetch<AdBreakResponse>(`/api/watch/${encodeURIComponent(key.value)}/ad`),
    enabled: active,
    // One roll of the dice per video. Without this a refocus refetches and can
    // swap the creative out from under a half-played ad.
    staleTime: Infinity,
    refetchOnWindowFocus: false
  })

  // A different video is a different break.
  watch(key, () => {
    watched.value = false
  })

  /**
   * The ad to play right now. Held back until the request settles so the main
   * video never starts and then gets yanked away a moment later — the player
   * shows its spinner for that beat instead, which is what it is for.
   */
  const ad = computed<AdBreak | null>(() => {
    if (!active.value || watched.value || query.isPending.value) return null
    return query.data.value?.ad ?? null
  })

  /** True while we still don't know — the player waits rather than guessing. */
  const resolving = computed(() => active.value && query.isPending.value)

  function complete() {
    watched.value = true
  }

  return { ad, resolving, complete }
}
