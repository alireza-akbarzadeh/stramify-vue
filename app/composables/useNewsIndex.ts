import type { NewsFilterState, NewsSummary } from '#shared/types/news'
import { filterNews, pickFeatured } from '#shared/utils/news'

/**
 * The columns `/news` reads. Everything except the parsed article body, which
 * is the largest column in the collection and is never rendered in a listing —
 * selecting it would ship every word of every article to draw a grid of cards.
 */
const LIST_FIELDS = [
  'path',
  'title',
  'description',
  'date',
  'category',
  'tags',
  'author',
  'cover',
  'featured',
  'readingMinutes'
] as const

/**
 * `/news` — the article index and the filter state over it.
 *
 * `lazy: true` rather than a blocking `await`: the query still runs during SSR
 * (so the list is in the served HTML and is crawlable), but a client-side
 * navigation into `/news` renders the skeleton immediately instead of sitting
 * on the previous page until SQLite answers.
 *
 * TanStack Query — which every server-backed surface in this app uses — is
 * deliberately not involved. Nuxt Content ships its own cached, payload-aware
 * fetching, and the collection only changes when the site is rebuilt, so there
 * is nothing for a stale-while-revalidate cache to revalidate against.
 */
export function useNewsIndex() {
  const { data, status, error, refresh } = useAsyncData(
    'news:index',
    () => queryCollection('news').order('date', 'DESC').select(...LIST_FIELDS).all(),
    { lazy: true }
  )

  const articles = computed(() => (data.value ?? []) as NewsSummary[])

  const filters = reactive<NewsFilterState>({ category: null, query: '' })
  const isFiltered = computed(() => filters.category !== null || filters.query.trim() !== '')

  const featured = computed(() => pickFeatured(articles.value))

  /**
   * The grid drops the lead story only while the page is unfiltered — once you
   * search or pick a desk you're looking for something specific, and silently
   * hiding one match because it happens to be the hero is the kind of "missing
   * result" that reads as a broken search.
   */
  const visible = computed(() => {
    const matches = filterNews(articles.value, filters)
    return isFiltered.value ? matches : matches.filter((item) => item.path !== featured.value?.path)
  })

  function clearFilters() {
    filters.category = null
    filters.query = ''
  }

  return { articles, error, featured, filters, isFiltered, clearFilters, refresh, status, visible }
}
