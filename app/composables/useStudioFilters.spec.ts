import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useStudioFilters } from './useStudioFilters'
import type { StudioVideo } from '#shared/types/studio'

function video(overrides: Partial<StudioVideo> = {}): StudioVideo {
  return {
    id: 'clip-a',
    title: 'Midnight Echo',
    description: 'A rooftop set',
    category: 'Music',
    visibility: 'public',
    orientation: 'landscape',
    thumbnailUrl: '/api/media/thumb/a.jpg',
    videoUrl: '/api/media/video/a.mp4',
    durationSeconds: 240,
    views: 100,
    comments: 2,
    likes: 5,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  }
}

const catalogue = [
  video({ id: 'a', title: 'Midnight Echo', views: 100, createdAt: '2026-08-01T00:00:00.000Z' }),
  video({
    id: 'b',
    title: 'Alpha Session',
    description: 'speedrun attempt',
    visibility: 'private',
    views: 900,
    createdAt: '2026-08-03T00:00:00.000Z'
  }),
  video({
    id: 'c',
    title: 'Zulu Takes',
    visibility: 'unlisted',
    views: 50,
    createdAt: '2026-08-02T00:00:00.000Z'
  })
]

const setup = () => useStudioFilters(ref(catalogue))

describe('useStudioFilters', () => {
  it('shows everything newest-first by default', () => {
    const { filtered } = setup()
    expect(filtered.value.map((v) => v.id)).toEqual(['b', 'c', 'a'])
  })

  it('filters by visibility', () => {
    const { visibility, filtered } = setup()
    visibility.value = 'private'
    expect(filtered.value.map((v) => v.id)).toEqual(['b'])
  })

  it('searches titles case-insensitively', () => {
    const { search, filtered } = setup()
    search.value = 'midnight'
    expect(filtered.value.map((v) => v.id)).toEqual(['a'])
  })

  it('searches descriptions too', () => {
    // A creator hunting their own back catalogue is as likely to remember a
    // phrase from the description as the title.
    const { search, filtered } = setup()
    search.value = 'speedrun'
    expect(filtered.value.map((v) => v.id)).toEqual(['b'])
  })

  it('combines search and visibility', () => {
    const { search, visibility, filtered } = setup()
    search.value = 'a'
    visibility.value = 'unlisted'
    expect(filtered.value.map((v) => v.id)).toEqual(['c'])
  })

  it.each([
    ['oldest', ['a', 'c', 'b']],
    ['views', ['b', 'a', 'c']],
    ['title', ['b', 'a', 'c']]
  ] as const)('sorts by %s', (sort, expected) => {
    const filters = setup()
    filters.sort.value = sort
    expect(filters.filtered.value.map((v) => v.id)).toEqual(expected)
  })

  it('never sorts the source array in place', () => {
    // `videos` is TanStack Query's cached array — sorting it would mutate what
    // every other component reads.
    const source = ref(catalogue)
    const filters = useStudioFilters(source)
    filters.sort.value = 'title'
    void filters.filtered.value
    expect(source.value.map((v) => v.id)).toEqual(['a', 'b', 'c'])
  })

  it('reports whether a filter is hiding rows', () => {
    // Drives the difference between "you have no uploads" and "nothing matches"
    // — showing either in place of the other is a dead end.
    const { search, visibility, filtering } = setup()
    expect(filtering.value).toBe(false)
    search.value = '  '
    expect(filtering.value).toBe(false)
    search.value = 'echo'
    expect(filtering.value).toBe(true)
    search.value = ''
    visibility.value = 'public'
    expect(filtering.value).toBe(true)
  })

  it('clears back to showing everything', () => {
    const filters = setup()
    filters.search.value = 'echo'
    filters.visibility.value = 'private'
    filters.clear()
    expect(filters.filtering.value).toBe(false)
    expect(filters.filtered.value).toHaveLength(3)
  })

  it('survives an undefined list while the query is still loading', () => {
    const { filtered } = useStudioFilters(ref(undefined))
    expect(filtered.value).toEqual([])
  })
})
