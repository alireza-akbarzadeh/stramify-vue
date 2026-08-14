import type { ClipVisibility, StudioVideo } from '#shared/types/studio'

export type StudioSort = 'newest' | 'oldest' | 'views' | 'title'

export type VisibilityFilter = ClipVisibility | 'all'

/**
 * Filtering and sorting for the content list, kept out of the component.
 *
 * Client-side because the list endpoint returns the whole catalogue for one
 * creator (see `server/api/studio/videos/index.get.ts`) — so switching a sort
 * or typing in the search box is instant and costs no request. The moment that
 * list needs paging, this composable is the thing that moves to the server,
 * and its shape is already the query it would send.
 */
export function useStudioFilters(videos: Ref<StudioVideo[] | undefined>) {
  const search = ref('')
  const visibility = ref<VisibilityFilter>('all')
  const sort = ref<StudioSort>('newest')

  const filtered = computed(() => {
    const term = search.value.trim().toLowerCase()

    const matching = (videos.value ?? []).filter((video) => {
      if (visibility.value !== 'all' && video.visibility !== visibility.value) return false
      if (!term) return true
      // Title and description both, because a creator searching their own back
      // catalogue is as likely to remember a phrase from the description.
      return (
        video.title.toLowerCase().includes(term) ||
        video.description.toLowerCase().includes(term)
      )
    })

    // Copied before sorting — `videos` is TanStack Query's cached array, and
    // sorting it in place would mutate the cache other components read.
    return [...matching].sort(COMPARATORS[sort.value])
  })

  /** True when a filter is hiding rows, which is a different empty state from "no uploads". */
  const filtering = computed(() => !!search.value.trim() || visibility.value !== 'all')

  function clear() {
    search.value = ''
    visibility.value = 'all'
  }

  return { search, visibility, sort, filtered, filtering, clear }
}

const COMPARATORS: Record<StudioSort, (a: StudioVideo, b: StudioVideo) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  views: (a, b) => b.views - a.views,
  // `localeCompare` so accented titles sort where a reader expects rather than
  // by code point.
  title: (a, b) => a.title.localeCompare(b.title)
}
