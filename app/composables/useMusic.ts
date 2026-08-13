import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import type { MusicPage } from '#shared/types/music'

/**
 * The `/music` page in one query.
 *
 * Not gated on the session, unlike the personalised library surfaces: the
 * endpoint returns a full page signed out too (just without the follows
 * shelf), so there's a real answer to fetch either way and a first-time
 * visitor gets a browse page rather than a login wall.
 *
 * The viewer's id *is* part of the key, though. Signing in has to move this
 * page — it gains a shelf — and without that the cache would keep serving the
 * signed-out response to a viewer who now has follows. The auth store is
 * filled during SSR, so the key is already right on first render.
 */
export function useMusic() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: ['music', computed(() => auth.user?.id ?? null)],
    queryFn: () => $fetch<MusicPage>('/api/music')
  })
}
