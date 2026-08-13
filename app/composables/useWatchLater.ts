import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { QueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { WATCH_LATER_MAX_LIMIT } from '#shared/types/library'
import type { WatchLaterItem } from '#shared/types/library'

/**
 * Everything Watch later caches, so one invalidation covers the home rail's ten,
 * the page's full list, and every bookmark in the app without any of them
 * knowing the others exist.
 */
export const WATCH_LATER_KEY = ['watch-later']

/**
 * The two shapes underneath it, kept apart because the optimistic patches below
 * have to target one without corrupting the other: a `setQueriesData` over the
 * whole prefix would hand the id array to a callback written for cards.
 */
const LIST_KEY = [...WATCH_LATER_KEY, 'list']
const IDS_KEY = [...WATCH_LATER_KEY, 'ids']

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
    queryKey: [...LIST_KEY, limit],
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    queryFn: () => $fetch<WatchLaterItem[]>('/api/watch-later', { query: { limit } })
  })
}

/**
 * Just the saved clip ids — the source of truth for every bookmark button.
 *
 * Separate from the list above because it answers a different question on a
 * different budget: "is this one video saved", asked by a whole grid of cards on
 * pages that have no interest in the queue itself. One shared cache entry, so
 * twenty-four cards on `/search` cost one small request between them.
 */
export function useWatchLaterIds() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: IDS_KEY,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    queryFn: () => $fetch<string[]>('/api/watch-later/ids')
  })
}

/**
 * Add or drop one id in the cached set, newest-first like the endpoint returns.
 *
 * Skips an absent cache entry rather than seeding one: a `[clipId]` written
 * before the real set has loaded would claim the queue holds exactly one video,
 * and every other bookmark on screen would go hollow until the fetch landed.
 */
function patchSavedIds(queryClient: QueryClient, clipId: string, saved: boolean) {
  queryClient.setQueryData<string[]>(IDS_KEY, (ids) => {
    if (!ids) return ids
    const without = ids.filter((id) => id !== clipId)
    return saved ? [clipId, ...without] : without
  })
}

/**
 * "Save to Watch later".
 *
 * Owned by the grid or rail rather than by each card, the same way
 * `useHomeFeedback` is: one mutation for a screenful of cards instead of
 * twenty-four copies of it.
 *
 * The id set is patched optimistically because the bookmark that triggered this
 * is on screen and has to fill immediately; the *list* is only invalidated,
 * because a card built client-side would be a guess at what the server returns
 * (`addedAt`, the channel avatar) and the shelf it feeds is scrolled away above
 * anyway.
 *
 * The toast fires on success, so it can't claim a save that failed, and it
 * carries the undo: once the menu has closed, the toast is the only thing left
 * on screen that knows what just happened.
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

    onMutate: async (clipId) => {
      await queryClient.cancelQueries({ queryKey: IDS_KEY })
      const previous = queryClient.getQueryData<string[]>(IDS_KEY)

      patchSavedIds(queryClient, clipId, true)
      return { previous }
    },

    onError: (_error, _clipId, context) => {
      queryClient.setQueryData(IDS_KEY, context?.previous)
    },

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
 * "Remove from Watch later" — the saved card's own affordance, and the second
 * press of a filled bookmark.
 *
 * Optimistic on both shapes, because something on screen is being dismissed:
 * waiting for a round trip to hide what the viewer already told you to hide
 * reads as a broken button. Every cached list is patched, not just the visible
 * one, so the card doesn't reappear when you walk from the rail to
 * `/watch-later`.
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

      const lists = queryClient.getQueriesData<WatchLaterItem[]>({ queryKey: LIST_KEY })
      const ids = queryClient.getQueryData<string[]>(IDS_KEY)

      queryClient.setQueriesData<WatchLaterItem[]>({ queryKey: LIST_KEY }, (items) =>
        items?.filter((item) => item.id !== clipId)
      )
      patchSavedIds(queryClient, clipId, false)

      return { lists, ids }
    },

    onError: (_error, _clipId, context) => {
      for (const [key, data] of context?.lists ?? []) {
        queryClient.setQueryData(key, data)
      }
      queryClient.setQueryData(IDS_KEY, context?.ids)
    },

    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCH_LATER_KEY })
  })
}

/**
 * The bookmark: one press saves, the next unsaves.
 *
 * This is what every card and the watch page's Save button call, so "saved"
 * means the same thing — a row in `watch_later`, on the account, on every
 * device — wherever you press it. Before this existed the bookmark wrote to a
 * `localStorage` list that `/watch-later` had never heard of, which is exactly
 * how a save can look like it worked and never arrive.
 *
 * Live sessions don't come through here: the queue is keyed at `clips.id` and a
 * stream is over by the time "later" arrives. `useSavedVideos` is the seam that
 * routes those to the local list instead.
 */
export function useWatchLaterToggle() {
  const { data } = useWatchLaterIds()
  const save = useSaveToWatchLater()
  const remove = useRemoveFromWatchLater()

  /** A Set, not `.includes`: this is read once per card, per render, per grid. */
  const savedIds = computed(() => new Set(data.value ?? []))

  function isSaved(clipId: string) {
    return savedIds.value.has(clipId)
  }

  function toggle(clipId: string) {
    // `submit` carries the signed-out guard and the undo toast; unsaving needs
    // neither — you can't have saved anything without an account, and the
    // bookmark emptying is its own confirmation.
    if (!isSaved(clipId)) return save.submit(clipId)

    remove.mutate(clipId, {
      onError: () => toast.error("Couldn't remove that from Watch later.")
    })
  }

  return { isSaved, toggle }
}
