import { describe, expect, it } from 'vitest'
import type { NewsSummary } from '../types/news'
import { filterNews, formatNewsDate, pickFeatured, readingMinutes } from './news'

function article(overrides: Partial<NewsSummary> = {}): NewsSummary {
  return {
    path: '/news/one',
    title: 'One watch page for clips and live',
    description: 'Clips and live channels now share a single page.',
    date: '2026-08-07',
    category: 'product',
    tags: ['watch', 'live'],
    author: { name: 'Streamify Product', role: 'Product' },
    featured: false,
    readingMinutes: 3,
    ...overrides
  }
}

describe('readingMinutes', () => {
  it('rounds to whole minutes at 220 words per minute', () => {
    expect(readingMinutes('word '.repeat(220))).toBe(1)
    expect(readingMinutes('word '.repeat(660))).toBe(3)
  })

  it('never returns zero for a short post', () => {
    expect(readingMinutes('Three words here')).toBe(1)
  })

  it('ignores frontmatter', () => {
    const withFrontmatter = `---\ntitle: ${'x '.repeat(400)}\n---\n\nOne two three.`
    expect(readingMinutes(withFrontmatter)).toBe(1)
  })

  it('ignores fenced code, which is not prose', () => {
    // 440 words of "code" would otherwise read as two extra minutes.
    const post = `Intro line.\n\n\`\`\`ts\n${'const x = 1\n'.repeat(200)}\`\`\`\n\nOutro line.`
    expect(readingMinutes(post)).toBe(1)
  })

  it('counts a link by its label, not its URL', () => {
    const withLink = `[watch page](https://example.com/a/very/long/url/that/is/not/read/aloud)`
    expect(readingMinutes(withLink)).toBe(1)
  })
})

describe('formatNewsDate', () => {
  it('formats an ISO date string', () => {
    expect(formatNewsDate('2026-08-07')).toBe('7 Aug 2026')
  })

  it('accepts a Date', () => {
    expect(formatNewsDate(new Date('2026-08-14T00:00:00Z'))).toBe('14 Aug 2026')
  })

  it('returns an empty string for an unparseable value rather than "Invalid Date"', () => {
    expect(formatNewsDate('not a date')).toBe('')
  })
})

describe('filterNews', () => {
  const items = [
    article({ path: '/news/a', title: 'Live chat goes realtime', category: 'roadmap', tags: [] }),
    article({ path: '/news/b', title: 'Creator Studio', category: 'creators', tags: ['uploads'] }),
    article({ path: '/news/c', title: 'Four layers', category: 'engineering', tags: ['nuxt'] })
  ]

  it('returns everything when nothing is set', () => {
    expect(filterNews(items, { category: null, query: '' })).toHaveLength(3)
  })

  it('filters by category', () => {
    const result = filterNews(items, { category: 'creators', query: '' })
    expect(result.map((item) => item.path)).toEqual(['/news/b'])
  })

  it('matches the query against the title, case-insensitively', () => {
    expect(filterNews(items, { category: null, query: 'LAYERS' })).toHaveLength(1)
  })

  it('matches the query against tags, so a tag-only term still finds the post', () => {
    const result = filterNews(items, { category: null, query: 'nuxt' })
    expect(result.map((item) => item.path)).toEqual(['/news/c'])
  })

  it('matches the query against the description', () => {
    expect(filterNews(items, { category: null, query: 'single page' })).toHaveLength(3)
  })

  it('ignores surrounding whitespace in the query', () => {
    expect(filterNews(items, { category: null, query: '   ' })).toHaveLength(3)
  })

  it('applies category and query together', () => {
    expect(filterNews(items, { category: 'roadmap', query: 'layers' })).toHaveLength(0)
  })
})

describe('pickFeatured', () => {
  it('prefers the first flagged article', () => {
    const items = [article({ path: '/news/a' }), article({ path: '/news/b', featured: true })]
    expect(pickFeatured(items)?.path).toBe('/news/b')
  })

  it('falls back to the newest article when nothing is flagged', () => {
    const items = [article({ path: '/news/a' }), article({ path: '/news/b' })]
    expect(pickFeatured(items)?.path).toBe('/news/a')
  })

  it('returns null for an empty newsroom', () => {
    expect(pickFeatured([])).toBeNull()
  })
})
