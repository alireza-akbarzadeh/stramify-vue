import { boolean, index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const clipCategoryEnum = pgEnum('clip_category', ['Music', 'Gaming', 'Creative'])

/**
 * Portrait or landscape — this is the whole definition of a "short" here.
 * `/shorts` serves the vertical ones as a full-screen snap feed and every
 * landscape surface (the clips grid, the home feed, a channel's Videos tab,
 * up-next) filters them back out: a 9:16 video in a 16:9 card is two black
 * bars and an unreadable thumbnail.
 *
 * A column rather than a separate `shorts` table (ADR-016) — a short *is* a
 * clip that happens to be tall, so sharing the table means comments (which
 * key on `clips.id`), reactions, follows, view counts and `/watch` slug
 * resolution all keep working with no new code behind them.
 *
 * Defaults to `landscape` so every row that existed before this column keeps
 * behaving exactly as it did.
 */
export const clipOrientationEnum = pgEnum('clip_orientation', ['landscape', 'vertical'])

/**
 * Real clips backing the discovery feed. `videoUrl` points at a directly
 * playable source (mp4/HLS) — Cloudflare Stream playback URLs will land
 * here once creator uploads exist (Phase 6/7); the column shape doesn't
 * need to change when that happens.
 */
export const clips = pgTable(
  'clips',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    creator: text('creator').notNull(),
    category: clipCategoryEnum('category').notNull(),
    // Nullable: added for the watch page (ADR-014) after rows already existed,
    // and creator uploads won't always carry one. The UI renders an explicit
    // "No description provided" rather than a blank block.
    description: text('description'),
    orientation: clipOrientationEnum('orientation').notNull().default('landscape'),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    views: integer('views').notNull().default(0),
    featured: boolean('featured').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    // Every read of this table is now scoped to one orientation and ordered by
    // recency — the shorts feed pages through it, the landscape surfaces filter
    // it out. Leading with `orientation` lets both use the same index.
    index('clips_orientation_created_idx').on(table.orientation, table.createdAt)
  ]
)
