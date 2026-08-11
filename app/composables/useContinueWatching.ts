import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import type { ContinueWatchingItem } from '#shared/types/library'

const QUERY_KEY = ['home', 'continue']

/**
 * The "Continue watching" rail.
 *
 * Gated on the session for the same reason `useFollowingFeed` is: the endpoint
 * answers `[]` signed out anyway, and skipping the request keeps a logged-out
 * home page at one round trip. The auth store is filled during SSR, so
 * `enabled` is already right on first render.
 *
 * `staleTime: 0` is deliberate and differs from the ranked feed: coming back
 * from a video you just watched must show the new position, and a cached rail
 * would show the old one.
 */
export function useContinueWatching() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: QUERY_KEY,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    queryFn: () => $fetch<ContinueWatchingItem[]>('/api/home/continue')
  })
}

/**
 * "Remove from Continue watching".
 *
 * Optimistic, because the card is being dismissed — waiting for a round trip
 * to make something disappear that the viewer already told you to hide reads
 * as a broken button. On failure the previous list is put back and the caller
 * surfaces a toast.
 */
export function useRemoveFromContinue() {
  const queryClient = useQueryClient()

  return useMutation({
    // The path is assembled from a `string`-typed base so the template starts
    // with a non-literal. Nuxt's typed `$fetch` otherwise tries to match the
    // literal against every route in the app and blows the instantiation depth
    // limit — the same reason `useWatchCommentMutations` builds a `base` first.
    mutationFn: (slug: string) => {
      const base: string = `/api/watch/${encodeURIComponent(slug)}`
      return $fetch(`${base}/progress`, { method: 'DELETE' })
    },

    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<ContinueWatchingItem[]>(QUERY_KEY)

      queryClient.setQueryData<ContinueWatchingItem[]>(QUERY_KEY, (items) =>
        (items ?? []).filter((item) => item.slug !== slug)
      )
      return { previous }
    },

    onError: (_error, _slug, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    }
  })
}
