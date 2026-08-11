import { useQuery } from '@tanstack/vue-query'
import type { ShortsPage } from '#shared/types/shorts'

/** A shelf's worth — enough to fill the row twice over on a wide screen. */
const SHELF_SIZE = 10

/**
 * The Shorts shelf on the home page.
 *
 * Reuses `/api/shorts` rather than adding a `/api/home/shorts`: it already
 * returns exactly these rows, already excludes nothing the shelf wants, and a
 * second endpoint over the same table would be one more place for the two to
 * disagree about what a short is.
 *
 * Its own query key, though — the full-screen feed at `/shorts` is an infinite
 * query keyed by its deep-link start id, and sharing a key with a 10-item
 * shelf would have one clobbering the other's cache.
 */
export function useHomeShorts() {
  return useQuery({
    queryKey: ['home', 'shorts'],
    queryFn: () => $fetch<ShortsPage>('/api/shorts', { query: { limit: SHELF_SIZE } }),
    select: (page: ShortsPage) => page.items
  })
}
