import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { LIKED_SORTS } from '#shared/types/library'
import type { InfiniteData } from '@tanstack/vue-query'
import type { LikedPage, LikedSort } from '#shared/types/library'

/** Everything `/liked` caches, so one invalidation covers every term and order. */
const LIKED_ROOT = ['liked']

/**
 * How long to wait after the last keystroke before querying. Same 250ms as
 * `/history` and the header's search box — long enough that typing a word is
 * one request, short enough that the list feels live.
 */
const SEARCH_DEBOUNCE_MS = 250

/**
 * The page's two filters — the search term and the sort order — mirrored into
 * `?q=` and `?sort=`.
 *
 * A filtered, reordered list is then a URL you can bookmark and return to with
 * the back button, rather than state that evaporates on reload. Both are seeded
 * from the URL on setup, so arriving at `/liked?q=guitar&sort=popular` shows the
 * filtered list, the word in the box and the right radio item ticked.
 *
 * One watcher over both, unlike `useHistorySearch`'s single-param version:
 * two watchers each calling `router.replace` would race and drop each other's
 * parameter. `replace`, not `push`, so "back" leaves the page instead of
 * deleting one letter of the search.
 */
export function useLikedFilters() {
  const route = useRoute()
  const router = useRouter()

  const term = ref(String(route.query.q ?? ''))
  const debounced = refDebounced(term, SEARCH_DEBOUNCE_MS)
  const sort = ref<LikedSort>(parseSort(route.query.sort))

  watch([debounced, sort], ([q, order]) => {
    router.replace({
      query: {
        ...(q ? { q } : {}),
        // The default order is the absence of the parameter — a `?sort=recent`
        // on every URL is noise that says nothing.
        ...(order === 'recent' ? {} : { sort: order })
      }
    })
  })

  return { term, debounced, sort }
}

/** `?sort=` from the URL, or the default for anything we don't recognise. */
function parseSort(value: unknown): LikedSort {
  return LIKED_SORTS.includes(value as LikedSort) ? (value as LikedSort) : 'recent'
}

/**
 * The viewer's liked videos, filtered and ordered.
 *
 * An infinite query rather than a paged one: "Load more" appends, it never
 * replaces. Both filters are part of the key, so changing either starts a fresh
 * list instead of appending matches under the old rows — and TanStack keeps the
 * previous combinations cached, so clearing the box is instant.
 *
 * Gated on the session for the same reason `useWatchLater` is: the endpoint
 * answers empty signed out anyway, and skipping the request keeps a logged-out
 * visit at zero round trips. The auth store is filled during SSR, so `enabled`
 * is already right on first render.
 *
 * `staleTime: 0`, like every other personalised surface here: liking something
 * on the watch page and coming back to a list that doesn't show it reads as a
 * dropped like.
 */
export function useLikedVideos(search: Ref<string>, sort: Ref<LikedSort>) {
  const auth = useAuthStore()

  return useInfiniteQuery({
    queryKey: [...LIKED_ROOT, 'list', search, sort],
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    initialPageParam: 0,
    getNextPageParam: (lastPage: LikedPage) => lastPage.nextCursor,
    queryFn: ({ pageParam }) =>
      $fetch<LikedPage>('/api/liked', {
        query: {
          cursor: pageParam,
          sort: sort.value,
          ...(search.value ? { q: search.value } : {})
        }
      })
  })
}

/**
 * "Remove from Liked videos" — the card's own affordance.
 *
 * Optimistic, because the card is being dismissed: waiting for a round trip to
 * make something disappear that the viewer already told you to hide reads as a
 * broken button. Every cached page of every term/order combination is filtered,
 * not just the visible one, so the card doesn't reappear when the search box is
 * cleared or the sort is changed.
 *
 * The watch page's own thumbs-up reads a different cache entry, so it's
 * invalidated by id — otherwise opening the video you just unliked would show
 * the button still lit.
 */
export function useRemoveLike() {
  const queryClient = useQueryClient()

  return useMutation({
    // The response generic is spelled out on purpose. Left off, Nuxt's typed
    // `$fetch` infers the body by matching the interpolated path against every
    // route in the app, which blows TypeScript's instantiation depth limit.
    mutationFn: (clipId: string) =>
      $fetch<{ removed: boolean }>(`/api/liked/${encodeURIComponent(clipId)}`, {
        method: 'DELETE'
      }),

    onMutate: async (clipId) => {
      await queryClient.cancelQueries({ queryKey: LIKED_ROOT })
      const previous = queryClient.getQueriesData<InfiniteData<LikedPage>>({
        queryKey: LIKED_ROOT
      })

      queryClient.setQueriesData<InfiniteData<LikedPage>>({ queryKey: LIKED_ROOT }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => item.id !== clipId)
              }))
            }
          : data
      )
      return { previous }
    },

    onError: (_error, _clipId, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },

    // `slug` is the clip id for a clip (see `WatchTarget`), so this is the same
    // key `useWatchReaction` holds the thumbs-up state under.
    onSuccess: (_result, clipId) => {
      queryClient.invalidateQueries({ queryKey: ['watch', 'reaction', clipId] })
    }
  })
}

/**
 * The undo behind "Removed from Liked videos".
 *
 * Not optimistic, unlike the removal it reverses: the card has already gone, so
 * putting it back before the server agrees would mean a second disappearance if
 * the request failed. Invalidating rather than re-inserting also puts the card
 * back in the position the *current* sort says it belongs, which this side
 * can't work out for "Most viewed".
 */
export function useRestoreLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clipId: string) =>
      $fetch<{ liked: boolean }>('/api/liked', { method: 'POST', body: { clipId } }),

    onSuccess: (_result, clipId) => {
      queryClient.invalidateQueries({ queryKey: LIKED_ROOT })
      queryClient.invalidateQueries({ queryKey: ['watch', 'reaction', clipId] })
    }
  })
}
