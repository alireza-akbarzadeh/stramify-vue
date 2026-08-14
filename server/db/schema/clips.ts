import { boolean, index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'

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
 * Who may reach a clip (ADR-030). Deliberately the same three values, in the
 * same order, as `playlist_visibility` — a creator who has met one of these
 * pickers should not have to learn a second vocabulary for the other.
 *
 * The meanings differ in one place only, and it is the one that matters:
 * `private` and `unlisted` are both excluded from every browse surface, but
 * `unlisted` still resolves at `/watch/<id>` for anyone holding the link while
 * `private` resolves for nobody but its owner. `publishedClips` in
 * `server/utils/discovery.ts` is the single expression of that rule.
 */
export const clipVisibilityEnum = pgEnum('clip_visibility', ['private', 'unlisted', 'public'])

/**
 * Real clips backing the discovery feed. `videoUrl` points at a directly
 * playable source (mp4/HLS) — for creator uploads it's a `/api/media/…` key
 * served out of object storage (ADR-031); for seeded rows it's an external
 * URL. Nothing downstream cares which, which is the point.
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
    /**
     * The account that uploaded this clip, and the only one Creator Studio
     * will let edit or delete it.
     *
     * Nullable, and every seeded row leaves it null: those clips predate
     * uploads and belong to a `creator` handle with no account behind it.
     * "Unowned" is therefore a real state, not a gap to backfill — and it is
     * why the studio lists by `owner_id` rather than by matching the signed-in
     * user's name against `creator`, which would hand a creator's catalogue to
     * anyone who renamed themselves after them.
     *
     * `set null` rather than cascade on account deletion: the clip may sit in
     * other people's playlists and watch history, and orphaning it degrades
     * those far less than tearing rows out from under them. What it costs is
     * that a deleted account's uploads become unmanageable — acceptable,
     * because there is by then nobody left to manage them.
     */
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    /**
     * Defaults to `public` for one reason: the migration that added this column
     * had to leave every row already in the table exactly as visible as it was
     * the day before. Nothing relies on the default afterwards — the upload
     * endpoint requires an explicit choice (`shared/types/studio.ts`), so a
     * missing field is a 400, never a silent publish.
     */
    visibility: clipVisibilityEnum('visibility').notNull().default('public'),
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
    index('clips_orientation_created_idx').on(table.orientation, table.createdAt),
    // Creator Studio's content list: one owner's uploads, newest first. Partial
    // would be tighter still, but this index is also what makes the ownership
    // check on every edit and delete a lookup rather than a scan.
    index('clips_owner_created_idx').on(table.ownerId, table.createdAt)
  ]
)
