import { boolean, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { clips } from './clips'
import { user } from './auth'

/**
 * Where a viewer stopped in a clip, so the home page can offer it back.
 *
 * **Clips only, and that's a real foreign key.** A live session has no resume
 * point — you rejoin at the live edge, not at the second you left — so a
 * `targetKind` discriminator like `reactions` carries would only ever hold one
 * value here. Keying straight at `clips.id` buys referential integrity back:
 * deleting a clip takes its progress rows with it.
 *
 * One row per user per clip (`unique`), rewritten in place as you watch. This
 * is a resume marker, not a watch log: it answers "where was I", not "what did
 * I watch, and when, and how many times". A per-play event table is a Phase 12
 * analytics concern and would be a different shape entirely.
 *
 * `durationSeconds` is denormalised off `clips` on purpose — the rail draws a
 * progress bar, and copying the runtime onto the row means the query behind it
 * doesn't have to join back for a number that never changes for a given clip.
 */
export const watchProgress = pgTable(
  'watch_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clipId: text('clip_id')
      .notNull()
      .references(() => clips.id, { onDelete: 'cascade' }),
    /** Playhead in whole seconds. Sub-second precision is noise for a resume point. */
    positionSeconds: integer('position_seconds').notNull().default(0),
    /** The clip's runtime as of the last write — see the note above. */
    durationSeconds: integer('duration_seconds').notNull(),
    /**
     * Watched to the end. Kept as a flag rather than inferred from
     * `position >= duration` because reaching the end resets the playhead to 0
     * in most players, which would otherwise read as "never started".
     */
    completed: boolean('completed').notNull().default(false),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => [
    unique('watch_progress_user_clip_unique').on(table.userId, table.clipId),
    // The rail reads one user's rows, most recent first. Both columns in one
    // index so that's an index scan rather than a sort over everything they
    // ever watched.
    index('watch_progress_user_updated_idx').on(table.userId, table.updatedAt)
  ]
)
