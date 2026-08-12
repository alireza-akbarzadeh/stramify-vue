import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { WATCH_LATER_MAX_LIMIT } from '#shared/types/library'
import type { WatchLaterItem } from '#shared/types/library'

/**
 * Everything Watch later caches, so one invalidation covers the home rail's ten
 * and the page's full list without either knowing the other exists.
 */
export const WATCH_LATER_KEY = ['watch-later']

function listKey(limit: number) {
  return [...WATCH_LATER_KEY, 'list', limit]
}

/**
 * The viewer's Watch later queue.
 *
 * `limit` is part of the key, so the home rail's ten and the page's screenful
 * are separate cache entries rather than one list that changes length depending
 * on which surface rendered last.
 *
 * Gated on the session for the same reason `useContinueWatching` is: the
 * endpoint answers `[]` signed out anyway, and skipping the request keeps a
 * logged-out home page at one round trip. The auth store is filled during SSR,
 * so `enabled` is already right on first render.
 *
 * `staleTime: 0`, like every other personalised shelf here: saving a video on
 * the watch page and coming back to a rail that doesn't show it reads as a
 * dropped save.
 */
export function useWatchLater(limit: number = WATCH_LATER_MAX_LIMIT) {
  const auth = useAuthStore()

  return useQuery({
    queryKey: listKey(limit),
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    queryFn: () => $fetch<WatchLaterItem[]>('/api/watch-later', { query: { limit } })
  })
}

/**
 * "Save to Watch later" from a video's ⋮ menu.
 *
 * Owned by the grid or rail rather than by each card, the same way
 * `useHomeFeedback` is: one mutation for a screenful of cards instead of
 * twenty-four copies of it.
 *
 * Not optimistic, unlike the removal below, because there is nothing on screen
 * to update — the card stays exactly where it is, and the shelf this feeds is
 * scrolled away above. The toast fires on success, so it can't claim a save
 * that failed, and it carries the undo: once the menu has closed, the toast is
 * the only thing left on screen that knows what just happened.
 *
 * The endpoint is idempotent, so a double press is a no-op rather than a second
 * row or an error.
 */
export function useSaveToWatchLater() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const remove = useRemoveFromWatchLater()

  const save = useMutation({
    // Response generic spelled out for the reason noted in
    // `useContinueWatching` — an interpolated path left to Nuxt's typed
    // `$fetch` blows TypeScript's instantiation depth limit.
    mutationFn: (clipId: string) =>
      $fetch<{ saved: boolean }>('/api/watch-later', { method: 'POST', body: { clipId } }),

    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCH_LATER_KEY })
  })

  /**
   * Save one video. Signed out it stops here with an explanation rather than
   * failing at the endpoint: the queue is account-bound, so there is genuinely
   * nowhere to put it, and a browser-local copy would be a save that silently
   * evaporates on the viewer's next device.
   */
  function submit(clipId: string) {
    if (!auth.isAuthenticated) {
      return toast.error('Log in to save videos for later.')
    }

    save.mutate(clipId, {
      onSuccess: () =>
        toast('Saved to Watch later', {
          action: { label: 'Undo', onClick: () => remove.mutate(clipId) }
        }),
      onError: () => toast.error("Couldn't save that to Watch later.")
    })
  }

  return { submit }
}

/**
 * "Remove from Watch later" — the saved card's own affordance.
 *
 * Optimistic, because the card is being dismissed: waiting for a round trip to
 * make something disappear that the viewer already told you to hide reads as a
 * broken button. Every cached list is patched, not just the visible one, so the
 * card doesn't reappear when you walk from the rail to `/watch-later`.
 */
export function useRemoveFromWatchLater() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clipId: string) =>
      $fetch<{ removed: boolean }>(`/api/watch-later/${encodeURIComponent(clipId)}`, {
        method: 'DELETE'
      }),

    onMutate: async (clipId) => {
      await queryClient.cancelQueries({ queryKey: WATCH_LATER_KEY })
      const previous = queryClient.getQueriesData<WatchLaterItem[]>({ queryKey: WATCH_LATER_KEY })

      queryClient.setQueriesData<WatchLaterItem[]>({ queryKey: WATCH_LATER_KEY }, (items) =>
        items?.filter((item) => item.id !== clipId)
      )
      return { previous }
    },

    onError: (_error, _clipId, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    }
  })
}
