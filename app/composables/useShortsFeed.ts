import { useInfiniteQuery } from '@tanstack/vue-query'
import type { Short, ShortsPage } from '#shared/types/shorts'

/** Every cache entry the feed and its mutations touch, named in one place. */
export const SHORTS_FEED_KEY = ['shorts', 'feed'] as const

/**
 * The vertical feed, paged.
 *
 * `startId` is read once and then frozen into the query key — a deep-linked
 * short is pinned to the front of page 0 server-side, and if the key tracked
 * the URL the feed would refetch from scratch every time scrolling updated
 * `?v=` (which it does, so the address bar always names the short you're
 * looking at).
 */
export function useShortsFeed(startId: string | null) {
  const query = useInfiniteQuery({
    queryKey: [...SHORTS_FEED_KEY, startId],
    queryFn: ({ pageParam }) =>
      $fetch<ShortsPage>('/api/shorts', {
        query: { cursor: pageParam, start: startId ?? undefined }
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor
  })

  const items = computed<Short[]>(() => query.data.value?.pages.flatMap((page) => page.items) ?? [])

  return { query, items }
}
