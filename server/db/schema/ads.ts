import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Pre-roll ad inventory.
 *
 * A real table with real, directly-playable creatives, for the same reason
 * `clips` and `live_streams` are real tables rather than fixtures: a hard-coded
 * ad reel in a component would be exactly the faked functionality CLAUDE.md §2
 * rules out, and the selection, weighting and skip rules are the parts worth
 * exercising against a database.
 *
 * There is deliberately **no `duration` column**. It was here, and it was wrong
 * within a day: the seeded values said 30s/15s/6s while the actual creatives
 * were 5.1s, 6.2s and 300s. A duration is a fact about the video file, so a
 * copy of it in the database is a second source of truth that drifts the
 * moment anyone swaps a URL — and it drifts silently, because nothing fails,
 * the countdown just lies. The player reports the real duration at runtime.
 *
 * `skipAfterSeconds` is nullable and that nullability is load-bearing: `null`
 * is an unskippable bumper, which is a different product than "skippable after
 * 0 seconds". Storing it per row rather than as one app-wide constant is what
 * lets a six-second bumper and a thirty-second spot coexist, which is how the
 * real thing is sold.
 */
export const ads = pgTable(
  'ads',
  {
    id: text('id').primaryKey(),
    advertiser: text('advertiser').notNull(),
    title: text('title').notNull(),
    videoUrl: text('video_url').notNull(),
    clickUrl: text('click_url').notNull(),
    /** Null = unskippable. See the note above. */
    skipAfterSeconds: integer('skip_after_seconds'),
    /**
     * Relative selection weight. Higher wins more often; 0 keeps a row on the
     * books without serving it, which is what lets a campaign be paused without
     * deleting its history.
     */
    weight: integer('weight').notNull().default(1),
    /**
     * Off by default. A creative is inert until someone deliberately turns it
     * on — the failure mode of the opposite default is serving an unfinished ad
     * to real viewers, which is not recoverable by editing the row afterwards.
     */
    active: boolean('active').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  // Selection reads only live rows, and that filter is the whole query.
  (table) => [index('ads_active_idx').on(table.active)]
)
