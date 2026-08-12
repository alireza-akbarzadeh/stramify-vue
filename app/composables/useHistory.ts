import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { HISTORY_RAIL_LIMIT } from '#shared/types/history'
import type { InfiniteData } from '@tanstack/vue-query'
import type { HistoryPage } from '#shared/types/history'

/** Everything `/history` caches, so one invalidation covers every search term. */
const HISTORY_ROOT = ['history']

/**
 * The home page's "Recently watched" rail.
 *
 * Deliberately *outside* `HISTORY_ROOT`, next to `['home', 'continue']`, even
 * though it reads the same endpoint. The mutations below patch every cache
 * entry under `HISTORY_ROOT` as `InfiniteData`, and this one holds a flat
 * array — one key for both shapes would mean `data.pages` on a list that has
 * none. Grouping it with the other home shelves also keeps "invalidate the home
 * page's personalised rails" a single prefix.
 */
const HOME_HISTORY_KEY = ['home', 'history']

/**
 * How long to wait after the last keystroke before querying. Long enough that
 * typing a word is one request, short enough that the list feels live — the
 * same 200–250ms band the header's search box uses.
 */
const SEARCH_DEBOUNCE_MS = 250

/**
 * The search box's term, mirrored into `?q=`.
 *
 * A filtered history is then a URL you can share, bookmark, and return to with
 * the back button, rather than a state that vanishes on reload.
 *
 * `replace`, not `push`: pushing on every debounced keystroke would bury the
 * page the viewer arrived from under a dozen entries, so "back" would mean
 * "delete one letter" instead of "leave history".
 *
 * The term is seeded from the URL on setup, so arriving at `/history?q=guitar`
 * shows both the filtered list and the word in the box.
 */
export function useHistorySearch() {
  const route = useRoute()
  const router = useRouter()

  const term = ref(String(route.query.q ?? ''))
  const debounced = refDebounced(term, SEARCH_DEBOUNCE_MS)

  watch(debounced, (value) => {
    router.replace({ query: value ? { q: value } : {} })
  })

  return { term, debounced }
}

/**
 * The watch history list, filtered by `search`.
 *
 * An infinite query rather than a paged one: the page appends on "Load more",
 * it never replaces. The term is part of the key, so typing starts a fresh list
 * instead of appending matches under the unfiltered rows — and TanStack keeps
 * the empty-term pages cached, so clearing the box is instant.
 *
 * Gated on the session for the same reason `useContinueWatching` is: the
 * endpoint answers empty signed out anyway, and skipping the request keeps a
 * logged-out visit at zero round trips. The auth store is filled during SSR, so
 * `enabled` is already right on first render.
 *
 * `staleTime: 0` is deliberate — coming back from a video you just watched must
 * show it at the top with its new position, and a cached list would not.
 *
 * Callers pass an already-debounced ref; debouncing here would bury the delay
 * in a composable that has no idea whether its input comes from a text field.
 */
export function useHistory(search: Ref<string>) {
  const auth = useAuthStore()

  return useInfiniteQuery({
    queryKey: [...HISTORY_ROOT, 'list', search],
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    initialPageParam: 0,
    getNextPageParam: (lastPage: HistoryPage) => lastPage.nextCursor,
    queryFn: ({ pageParam }) =>
      $fetch<HistoryPage>('/api/history', {
        query: { cursor: pageParam, ...(search.value ? { q: search.value } : {}) }
      })
  })
}

/**
 * The last few videos this viewer watched — the home page's "Recently watched"
 * rail.
 *
 * The same `/api/history` the page reads, asked for ten rows and unfiltered.
 * A plain query rather than the infinite one above: a rail has no "load more",
 * and its ten cards are one response, so `useInfiniteQuery`'s page bookkeeping
 * would be structure with nothing to hold.
 *
 * Gated and `staleTime: 0` for the same reasons as `useHistory` — coming home
 * from a video you just watched has to show it at the front of the rail.
 */
export function useRecentHistory() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: HOME_HISTORY_KEY,
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 0,
    queryFn: async () => {
      const page = await $fetch<HistoryPage>('/api/history', {
        query: { limit: HISTORY_RAIL_LIMIT }
      })
      // The rail wants rows, not a page — `nextCursor` is meaningless to a
      // shelf that can't page. Unwrapping here keeps that detail out of the
      // component.
      return page.items
    }
  })
}

/**
 * Remove one video from history.
 *
 * Reuses the Continue-watching rail's endpoint rather than adding a second one:
 * both mean "forget where I was in this clip", and there is only one row to
 * delete. Optimistic, because the row is being dismissed — waiting for a round
 * trip to make something disappear that the viewer already told you to hide
 * reads as a broken button.
 *
 * Every cached page of every search term is filtered, not just the visible one,
 * so the row doesn't reappear when the viewer clears the search box. The home
 * rail is invalidated rather than edited: it has its own resumable-window rules
 * and re-deriving them here would put that logic in two places.
 */
export function useRemoveFromHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    // The response generic is spelled out on purpose. Left off, Nuxt's typed
    // `$fetch` infers the body by matching the interpolated path against every
    // route in the app, which blows TypeScript's instantiation depth limit.
    mutationFn: (slug: string) =>
      $fetch<{ removed: boolean }>(`/api/watch/${encodeURIComponent(slug)}/progress`, {
        method: 'DELETE'
      }),

    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: HISTORY_ROOT })
      const previous = queryClient.getQueriesData<InfiniteData<HistoryPage>>({
        queryKey: HISTORY_ROOT
      })

      queryClient.setQueriesData<InfiniteData<HistoryPage>>({ queryKey: HISTORY_ROOT }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => item.slug !== slug)
              }))
            }
          : data
      )
      return { previous }
    },

    onError: (_error, _slug, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home', 'continue'] })
      // The rail reads the same rows this just deleted. Invalidated rather than
      // patched: it holds a fixed ten, so dropping one has to pull the eleventh
      // up rather than leave a short shelf.
      queryClient.invalidateQueries({ queryKey: HOME_HISTORY_KEY })
    }
  })
}

/**
 * "Clear all watch history".
 *
 * Not optimistic, unlike the single-row removal: this one is irreversible and
 * wipes the whole page, so the list stays put until the server confirms rather
 * than blanking and then repopulating if the request fails. The confirm dialog
 * has already absorbed the wait.
 */
export function useClearHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => $fetch<{ removed: number }>('/api/history', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_ROOT })
      // Continue-watching and the home rail read the same rows, so both are
      // now empty too. Named individually rather than invalidating the whole
      // `home` prefix, which would also throw away the recommendation feed.
      queryClient.invalidateQueries({ queryKey: ['home', 'continue'] })
      queryClient.invalidateQueries({ queryKey: HOME_HISTORY_KEY })
    }
  })
}
