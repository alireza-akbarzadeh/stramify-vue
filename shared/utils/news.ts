import type { NewsCategory, NewsFilterState, NewsSummary } from '../types/news'

/**
 * Editorial copy and colour for each desk. Static on purpose — this is the
 * newsroom's own chrome, not data. The tint is a CSS variable name rather than
 * a hex value so both themes follow the palette in `assets/css/main.css`.
 */
export const NEWS_CATEGORY_META: Record<
  NewsCategory,
  { label: string; blurb: string; tint: string }
> = {
  product: {
    label: 'Product',
    blurb: 'What shipped, and what it changes for anyone watching.',
    tint: 'var(--primary)'
  },
  creators: {
    label: 'Creators',
    blurb: 'Uploading, publishing, and running a channel on Streamify.',
    tint: 'var(--secondary)'
  },
  engineering: {
    label: 'Engineering',
    blurb: 'How the platform is built, and the trade-offs behind it.',
    tint: 'var(--accent)'
  },
  roadmap: {
    label: 'Roadmap',
    blurb: "What we're building next — nothing here has shipped yet.",
    tint: 'var(--warning)'
  }
}

/** `'product'` → `'Product'`, falling back to the raw slug for safety. */
export function newsCategoryLabel(category: NewsCategory): string {
  return NEWS_CATEGORY_META[category]?.label ?? category
}

const WORDS_PER_MINUTE = 220

/**
 * Reading time, from the markdown source rather than the rendered body.
 *
 * Called once per file at build time (the `content:file:afterParse` hook), so
 * the number in the UI is always the current text — the usual alternative, a
 * `readingMinutes:` field in frontmatter, goes stale the first time someone
 * edits a paragraph and nobody notices for months.
 *
 * Code blocks are stripped before counting. A 60-line config sample is not 60
 * lines of prose, and leaving it in turns a two-minute post into a nine-minute
 * one. Everything else — including MDC block content — counts as text.
 */
export function readingMinutes(markdown: string): number {
  const prose = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '') // frontmatter
    .replace(/```[\s\S]*?```/g, '') // fenced code
    .replace(/`[^`\n]*`/g, '') // inline code
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images keep their label
    .replace(/[#>*_~|-]/g, ' ') // markdown punctuation is not a word

  const words = prose.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/**
 * `'2026-08-14'` → `'14 Aug 2026'`.
 *
 * Fixed `en-GB` rather than the visitor's locale: the date sits inline in a
 * meta row next to the reading time, and a locale that renders `8/14/2026`
 * reflows that row differently for every reader. Accepts a `Date` too because
 * a `z.date()` column comes back as a string over the wire but as a `Date`
 * when a page is rendered from the in-memory collection during SSG.
 */
export function formatNewsDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The client-side filter behind the search box and the category chips.
 *
 * Filtering here rather than re-querying the collection: the whole index is a
 * few dozen rows of metadata that `/news` has already fetched, so a round trip
 * per keystroke would buy nothing and cost the instant feel. It stays a pure
 * function — no refs, no query — which is what makes it testable.
 *
 * Tags are matched as well as title and description, so searching "chat" finds
 * a post that only carries the tag.
 */
export function filterNews(items: NewsSummary[], { category, query }: NewsFilterState) {
  const needle = query.trim().toLowerCase()

  return items.filter((item) => {
    if (category && item.category !== category) return false
    if (!needle) return true

    return (
      item.title.toLowerCase().includes(needle) ||
      item.description.toLowerCase().includes(needle) ||
      item.tags.some((tag) => tag.toLowerCase().includes(needle))
    )
  })
}

/**
 * The article the page leads with: the newest one flagged `featured`, or the
 * newest one full stop.
 *
 * The fallback is what keeps the page honest — the hero renders whatever is
 * actually newest even if every `featured` flag is removed, instead of leaving
 * a hole at the top of the page.
 *
 * Assumes `items` is already ordered newest-first, which is how `/news`
 * queries it (`.order('date', 'DESC')` — sorting in SQL, not again here).
 */
export function pickFeatured(items: NewsSummary[]): NewsSummary | null {
  return items.find((item) => item.featured) ?? items[0] ?? null
}
