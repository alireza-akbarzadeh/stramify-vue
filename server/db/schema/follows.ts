import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import type { ChannelNotifyMode } from '#shared/types/channel'
import { user } from './auth'

/**
 * Who follows which channel.
 *
 * `channel` is a text handle, not a foreign key, because there is no
 * `channels` table yet — `clips.creator` and `live_streams.streamer_name` are
 * the only channel identity in the schema today, and both are free text. The
 * known cost: renaming a channel orphans its followers. Accepted for now and
 * recorded in ADR-014; a future `channels` table turns this column into an FK
 * in one migration.
 *
 * `notify` is the bell state, and it lives on this row rather than in its own
 * table because it has no meaning without the follow — unfollowing deletes the
 * preference with it, which is the behaviour we want.
 */
export const follows = pgTable(
  'follows',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(),
    /**
     * Which of this channel's events reach the bell: `all` (uploads + going
     * live), `live` (going live only), or `none`. Text rather than a pg enum
     * so adding a mode later is a value change, not a type migration.
     *
     * `all` is the default because that is what the feed did for every follow
     * before this column existed — an existing row keeps behaving the same.
     */
    notify: text('notify').notNull().default('all').$type<ChannelNotifyMode>(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    unique('follows_user_channel_unique').on(table.userId, table.channel),
    // Follower counts read by channel, so this carries the `/watch` header.
    index('follows_channel_idx').on(table.channel)
  ]
)
