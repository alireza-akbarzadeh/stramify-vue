import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { MixDetail, MixSummary } from '#shared/types/mix'

/**
 * The "Mixes for you" shelf.
 *
 * Not gated on a session, unlike the following and continue-watching rails:
 * the endpoint returns a useful shelf for signed-out viewers too (seeded by
 * reach rather than by their history), so there's a real answer to fetch.
 */
export function useMixes() {
  return useQuery({
    queryKey: ['home', 'mixes'],
    queryFn: () => $fetch<MixSummary[]>('/api/home/mixes')
  })
}

/**
 * One opened mix. The id is part of the key, so navigating between mixes
 * swaps lists instead of appending, and going back to one you've seen is
 * served from cache.
 */
export function useMix(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['mix', computed(() => toValue(id))],
    queryFn: () => $fetch<MixDetail>(`/api/mix/${encodeURIComponent(toValue(id))}`)
  })
}
