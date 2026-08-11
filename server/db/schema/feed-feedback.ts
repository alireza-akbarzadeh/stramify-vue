import { index, pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const feedFeedbackKindEnum = pgEnum('feed_feedback_kind', ['video', 'channel'])

/**
 * "Not interested" / "Don't recommend this channel" — one row per thing a
 * viewer has told the feed to stop showing them.
 *
 * Stored rather than kept client-side because the suppression has to happen in
 * the ranking query: filtering after the fact would leave the page short by
 * however many rows were hidden, and the next page would repeat the offset.
 *
 * `target` is a `clips.id`/`live_streams.id` when `kind = 'video'` and a
 * lowercase channel handle when `kind = 'channel'` — the same "text handle, no
 * FK" trade-off `follows.channel` already makes, recorded in ADR-014. One
 * column instead of two nullable ones, with `kind` saying how to read it.
 *
 * The unique constraint makes the write idempotent: pressing "Not interested"
 * on a card that's already hidden is a no-op insert, not a duplicate row.
 */
export const feedFeedback = pgTable(
  'feed_feedback',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: feedFeedbackKindEnum('kind').notNull(),
    target: text('target').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    unique('feed_feedback_user_target_unique').on(table.userId, table.kind, table.target),
    // Every feed query reads this whole set for one user, so the index is on
    // `user_id` alone — the kind/target match happens over those few rows.
    index('feed_feedback_user_idx').on(table.userId)
  ]
)
