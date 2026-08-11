import { index, integer, pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { clips } from './clips'
import { user } from './auth'

/**
 * Who can open a playlist by its link.
 *
 * `unlisted` exists as its own value rather than being folded into `public`
 * because the two differ in one thing that matters later: whether the playlist
 * may be listed on the owner's channel page. Nothing lists playlists yet, so
 * today `unlisted` and `public` read identically — the distinction is recorded
 * now so the column doesn't need a migration when that page arrives.
 */
export const playlistVisibilityEnum = pgEnum('playlist_visibility', [
  'private',
  'unlisted',
  'public'
])

/**
 * A viewer's own ordered collection of clips.
 *
 * Deliberately separate from `stores/watchlist` (localStorage) — that's a
 * one-click bookmark bound to a browser, this is named, ordered, shareable and
 * bound to an account. Both exist on YouTube for the same reason (Watch later
 * vs. a playlist) and collapsing them would mean either losing the anonymous
 * save or forcing a login to bookmark anything.
 */
export const playlists = pgTable(
  'playlists',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    visibility: playlistVisibilityEnum('visibility').notNull().default('private'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    /**
     * Touched whenever an item is added or removed, not just when the title
     * changes — "your playlists" is sorted by recent activity, and a list you
     * added to this morning is more use to you than one you renamed last year.
     */
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  // The library page reads one owner's playlists, most recently touched first.
  (table) => [index('playlists_user_updated_idx').on(table.userId, table.updatedAt)]
)

/**
 * One clip in one playlist.
 *
 * **Clips only** — a live session ends, and a saved collection whose entries go
 * dead is worse than one that can't hold them. A stream's VOD is a clip and
 * belongs here; the stream itself doesn't.
 *
 * `position` is a sparse integer, not a dense 0..n. Appending is
 * `max(position) + 1` — one read, one insert, no renumbering of the rows below
 * it — and removing an item leaves a gap that nothing reads, because order is
 * `order by position` and gaps don't affect that.
 */
export const playlistItems = pgTable(
  'playlist_items',
  {
    id: text('id').primaryKey(),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    clipId: text('clip_id')
      .notNull()
      .references(() => clips.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    addedAt: timestamp('added_at').notNull().defaultNow()
  },
  (table) => [
    // A clip is in a playlist or it isn't; adding it twice is a no-op, not a
    // duplicate row. This is what makes the add endpoint an idempotent upsert.
    unique('playlist_items_playlist_clip_unique').on(table.playlistId, table.clipId),
    index('playlist_items_playlist_position_idx').on(table.playlistId, table.position)
  ]
)
