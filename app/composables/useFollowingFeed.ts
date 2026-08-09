import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import type { HomeVideo } from '#shared/types/home'

/**
 * Latest from the channels the viewer follows.
 *
 * Only runs when there's a session — signed out the endpoint would return an
 * empty array anyway, and skipping the request keeps a logged-out home page at
 * one round trip. The store hydrates during SSR (`plugins/auth-session.ts`),
 * so `enabled` is already correct on first render rather than flipping after
 * hydration and causing a second fetch.
 */
export function useFollowingFeed() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: ['home', 'following'],
    enabled: computed(() => auth.isAuthenticated),
    queryFn: () => $fetch<HomeVideo[]>('/api/home/following')
  })
}
