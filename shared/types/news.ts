/**
 * The newsroom's content model.
 *
 * These types are the contract between three places that must not drift:
 * `content.config.ts` builds its Zod schema from `NEWS_CATEGORIES`, every
 * article's frontmatter is validated against that schema at build time, and
 * `/news` reads the result back out. Adding a category is one edit here.
 *
 * Unlike the rest of `#shared/types/*` this describes files on disk rather
 * than a database table — the newsroom is a file-based CMS (ADR-034), so the
 * "backend" is `content/news/*.md` compiled into Nuxt Content's SQLite index.
 */
export const NEWS_CATEGORIES = ['product', 'creators', 'engineering', 'roadmap'] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

/**
 * A byline. `name` is a desk rather than a person — the newsroom publishes on
 * behalf of the team that shipped the thing, and inventing individual staff
 * would be putting fake people in a production surface.
 */
export interface NewsAuthor {
  name: string
  role: string
}

/**
 * Optional cover art. When an article has none, `NewsCover.vue` draws a panel
 * from the category's own colour instead of rendering a broken `<img>`.
 */
export interface NewsCoverImage {
  src: string
  alt: string
}

/**
 * What a listing needs, and nothing else — exactly the columns `/news`
 * selects. The parsed body is deliberately absent: it is by far the largest
 * column in the collection and a grid of cards never renders a word of it.
 */
export interface NewsSummary {
  path: string
  title: string
  description: string
  /** ISO date string. Stored as a `DATE` column, so it sorts in SQL. */
  date: string
  category: NewsCategory
  tags: string[]
  author: NewsAuthor
  cover?: NewsCoverImage
  featured: boolean
  /** Computed from the markdown source at build time, never hand-written. */
  readingMinutes: number
}

/** The filter state `/news` drives its grid from. */
export interface NewsFilterState {
  /** `null` means "every category", which is the default. */
  category: NewsCategory | null
  query: string
}
