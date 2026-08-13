import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, follows, liveStreams, notificationReads } from '../db/schema'
import { publishedClips } from './discovery'
import { formatAge } from './format'
import { toChannelHandle } from '#shared/utils/channel'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { AppNotification, NotificationFeed } from '#shared/types/notification'

/** How many entries the bell holds. Older activity lives on `/following`. */
const FEED_LIMIT = 20

/**
 * An event before it's been told whether it's unread. `at` is kept as a `Date`
 * so the two sources can be merged in one chronological order before either is
 * formatted for display.
 */
type Event = Omit<AppNotification, 'unread' | 'age'> & { at: Date }

/**
 * Handles the user follows, canonicalised the way every other join does it,
 * each carrying its bell setting.
 *
 * `follows_user_channel_unique` is on the raw text, so two rows can still
 * canonicalise to the same handle with different settings. That collapses to
 * the louder of the two — a stray duplicate row should never be what silences
 * a channel.
 */
async function followedChannels(userId: string): Promise<Map<string, ChannelNotifyMode>> {
  const rows = await db
    .select({ channel: follows.channel, notify: follows.notify })
    .from(follows)
    .where(eq(follows.userId, userId))

  const loudness: Record<ChannelNotifyMode, number> = { all: 2, live: 1, none: 0 }
  const modes = new Map<string, ChannelNotifyMode>()
  for (const row of rows) {
    const handle = toChannelHandle(row.channel)
    const current = modes.get(handle)
    if (!current || loudness[row.notify] > loudness[current]) modes.set(handle, row.notify)
  }
  return modes
}

/**
 * The handles whose events of `kind` the viewer asked to hear about — the one
 * place the bell settings turn into a query. Exported so that rule is pinned
 * by a test without a database behind it.
 */
export function handlesFor(
  modes: Map<string, ChannelNotifyMode>,
  kind: 'live' | 'upload'
): string[] {
  const wanted: ChannelNotifyMode[] = kind === 'live' ? ['all', 'live'] : ['all']
  return [...modes]
    .filter(([, mode]) => wanted.includes(mode))
    .map(([handle]) => handle)
}

async function liveEvents(handles: string[]): Promise<Event[]> {
  if (handles.length === 0) return []
  const rows = await db
    .select()
    .from(liveStreams)
    .where(inArray(sql`lower(${liveStreams.streamerName})`, handles))
    .orderBy(desc(liveStreams.startedAt))
    .limit(FEED_LIMIT)

  return rows.map((row) => ({
    id: `live:${row.id}`,
    kind: 'live' as const,
    channel: row.streamerName,
    title: row.title,
    image: row.thumbnailUrl,
    slug: row.streamerName,
    at: row.startedAt
  }))
}

async function uploadEvents(handles: string[]): Promise<Event[]> {
  if (handles.length === 0) return []
  const rows = await db
    .select()
    .from(clips)
    .where(and(publishedClips, inArray(sql`lower(${clips.creator})`, handles)))
    .orderBy(desc(clips.createdAt))
    .limit(FEED_LIMIT)

  return rows.map((row) => ({
    id: `upload:${row.id}`,
    kind: 'upload' as const,
    channel: row.creator,
    title: row.title,
    image: row.thumbnailUrl,
    slug: row.id,
    at: row.createdAt
  }))
}

/** The user's read cursor, or `null` if they've never cleared the bell. */
async function readCursor(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ readAt: notificationReads.readAt })
    .from(notificationReads)
    .where(eq(notificationReads.userId, userId))
    .limit(1)

  return row?.readAt ?? null
}

/**
 * What the bell shows: recent activity from the channels this user follows,
 * newest first, with everything after their last "mark all read" flagged.
 *
 * A user who follows nobody gets an empty feed rather than a global one —
 * this is a follow feed, not a firehose. Each follow's bell decides which of
 * its events qualify, so muting a channel here is what stops the row from
 * being read at all rather than something the client filters out afterwards.
 */
export async function readNotifications(userId: string): Promise<NotificationFeed> {
  const modes = await followedChannels(userId)
  if (modes.size === 0) return { items: [], unreadCount: 0 }

  const [live, uploads, cursor] = await Promise.all([
    liveEvents(handlesFor(modes, 'live')),
    uploadEvents(handlesFor(modes, 'upload')),
    readCursor(userId)
  ])

  const items = [...live, ...uploads]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, FEED_LIMIT)
    .map(({ at, ...event }) => ({
      ...event,
      age: formatAge(at),
      unread: !cursor || at > cursor
    }))

  return { items, unreadCount: items.filter((item) => item.unread).length }
}

/** Clear the bell: everything up to now counts as seen. */
export async function markNotificationsRead(userId: string): Promise<void> {
  const readAt = new Date()
  await db
    .insert(notificationReads)
    .values({ userId, readAt })
    .onConflictDoUpdate({ target: notificationReads.userId, set: { readAt } })
}
