import { useInfiniteQuery } from '@tanstack/vue-query'
import type { HomeChip, HomeFeedPage } from '#shared/types/home'

/**
 * The recommended feed for the active chip.
 *
 * An infinite query rather than a paged one: the home page appends, it never
 * replaces, so "Load more" must keep what's already on screen. The chip is
 * part of the key, so switching filters starts a fresh list instead of
 * appending Gaming results underneath Music ones — and TanStack keeps the
 * previous chip's pages cached, so going back to it is instant.
 */
export function useHomeFeed(chip: Ref<HomeChip>) {
  return useInfiniteQuery({
    queryKey: ['home', 'feed', computed(() => chip.value.id)],
    initialPageParam: 0,
    getNextPageParam: (lastPage: HomeFeedPage) => lastPage.nextCursor,
    queryFn: ({ pageParam }) =>
      $fetch<HomeFeedPage>('/api/home/feed', {
        query: {
          cursor: pageParam,
          ...(chip.value.category ? { category: chip.value.category } : {}),
          ...(chip.value.live ? { live: 'true' } : {})
        }
      })
  })
}
