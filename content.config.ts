import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'
import { NEWS_CATEGORIES } from './shared/types/news'

/**
 * Nuxt Content collections. See ADR-034 for why the newsroom is files rather
 * than a `news` table.
 *
 * `type: 'page'` (not `'data'`) because every article is addressable: the
 * collection's `path` column is what `/news/[...slug]` resolves against, and
 * it is derived from the file path — `content/news/foo.md` → `/news/foo`.
 *
 * The schema is not decoration. Nuxt Content validates every file against it
 * while building the index, so a typo'd category or a missing byline fails the
 * build instead of rendering an empty chip in production. Anything not listed
 * here still parses, but lands in the untyped `meta` column and is invisible
 * to `.select()` — which is the point: this list *is* the frontmatter spec.
 */
export default defineContentConfig({
  collections: {
    news: defineCollection({
      type: 'page',
      source: 'news/**/*.md',
      schema: z.object({
        // Required rather than optional (the built-in page schema has it as
        // optional): it is the card's summary line and the `<meta>`
        // description, so an article without one ships two visible holes.
        description: z.string(),
        date: z.date(),
        category: z.enum(NEWS_CATEGORIES),
        tags: z.array(z.string()).default([]),
        author: z.object({ name: z.string(), role: z.string() }),
        cover: z.object({ src: z.string(), alt: z.string() }).optional(),
        featured: z.boolean().default(false),
        // Filled by the `content:file:afterParse` hook in `nuxt.config.ts`,
        // never by hand — a hand-written estimate drifts the moment anyone
        // edits a paragraph. The default only covers a file the hook skipped.
        readingMinutes: z.number().default(1)
      })
    })
  }
})
