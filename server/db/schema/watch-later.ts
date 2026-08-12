import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { clips } from './clips'
import { user } from './auth'

/**
 * "Save this for later" — a flat, account-bound queue of clips.
 *
 * **Not a playlist, and not the localStorage watchlist.** All three exist here
 * for the same reason they do on YouTube:
 *
 * - `stores/watchlist` is a one-click bookmark bound to a *browser*. It works
 *   signed out, which is exactly why it can't back this: a queue you can't
 *   reach from your phone isn't a queue.
 * - `playlists` are named, ordered and shareable. Modelling Watch later as a
 *   magic row in that table would mean every playlist query needs a "…except
 *   the special one" clause, and every rename/delete path needs to refuse it.
 *
 * So: its own table, two columns of meaning. Unordered by design — the only
 * order it has is when you saved something, so there is no `position` to
 * renumber and adding is a single insert with no read first.
 *
 * **Clips only**, and that's a real foreign key, matching `watch_progress`: a
 * live session ends, and a queue whose entries go dead is worse than one that
 * can't hold them. A stream's VOD is a clip and belongs here; the stream itself
 * doesn't. Deleting a clip takes its saves with it.
 */
export const watchLater = pgTable(
  'watch_later',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clipId: text('clip_id')
      .notNull()
      .references(() => clips.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').notNull().defaultNow()
  },
  (table) => [
    // A clip is saved or it isn't; saving it twice is a no-op, not a second
    // row. This is what lets the add endpoint be an idempotent upsert, which
    // in turn is what lets the menu item fire without checking first.
    unique('watch_later_user_clip_unique').on(table.userId, table.clipId),
    // Every read is one user's rows, most recently saved first — both columns
    // in one index so that's an index scan rather than a sort over everything
    // they ever saved. Same shape as `watch_progress_user_updated_idx`.
    index('watch_later_user_added_idx').on(table.userId, table.addedAt)
  ]
)
