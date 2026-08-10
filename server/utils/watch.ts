import { eq, ilike } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, liveStreams } from '../db/schema'
import type { ClipRow, LiveStreamRow } from './discovery'
import { formatAge, formatDuration, formatUptime } from './format'
import type { RelatedItem, WatchTarget } from '#shared/types/watch'

/**
 * What `/watch/[slug]` resolved to, alongside the raw row — endpoints that
 * need the row (view counts, chat, comments) get it without a second query.
 */
export type ResolvedTarget =
  | { kind: 'clip'; row: ClipRow; target: WatchTarget }
  | { kind: 'live'; row: LiveStreamRow; target: WatchTarget }

/** Clip row → watch-page wire shape. */
export function toWatchClip(row: ClipRow): WatchTarget {
  return {
    kind: 'clip',
    id: row.id,
    slug: row.id,
    title: row.title,
    channel: row.creator,
    category: row.category,
    description: row.description ?? '',
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    orientation: row.orientation,
    views: `${formatCount(row.views)} views`,
    publishedAt: formatAge(row.createdAt),
    duration: formatDuration(row.durationSeconds)
  }
}

/** Live row → watch-page wire shape. The slug is the handle, not the row id. */
export function toWatchLive(row: LiveStreamRow): WatchTarget {
  return {
    kind: 'live',
    id: row.id,
    slug: row.streamerName,
    title: row.title,
    channel: row.streamerName,
    category: row.category,
    description: row.description ?? '',
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    viewers: `${formatCount(row.viewerCount)} watching`,
    uptime: formatUptime(row.startedAt)
  }
}

/**
 * Resolve one URL slug to whatever it names, clips first.
 *
 * The two namespaces can't collide by construction: clip ids are slugs
 * (`clip-midnight-echo`), live slugs are streamer handles (`Viper_Squadron`).
 * Clips are matched exactly and live handles case-insensitively, matching the
 * behaviour `/api/discovery/live/[streamer]` already has. Returns `null` for
 * an unknown slug so callers decide between 404 and a fallback.
 */
export async function resolveWatchTarget(slug: string): Promise<ResolvedTarget | null> {
  const [clipRow] = await db.select().from(clips).where(eq(clips.id, slug)).limit(1)
  if (clipRow) return { kind: 'clip', row: clipRow, target: toWatchClip(clipRow) }

  const [liveRow] = await db
    .select()
    .from(liveStreams)
    .where(ilike(liveStreams.streamerName, slug))
    .limit(1)
  if (liveRow) return { kind: 'live', row: liveRow, target: toWatchLive(liveRow) }

  return null
}

/**
 * Just the live stream for a handle, or `null`.
 *
 * `resolveWatchTarget` costs two queries for a live slug (clips miss, then
 * live hit). The chat endpoints are live-only and one of them is polled every
 * few seconds per viewer, so they take this single-query path instead.
 */
export async function resolveLiveStream(slug: string): Promise<LiveStreamRow | null> {
  const [row] = await db
    .select()
    .from(liveStreams)
    .where(ilike(liveStreams.streamerName, slug))
    .limit(1)
  return row ?? null
}

export function clipToRelated(row: ClipRow): RelatedItem {
  return {
    id: row.id,
    slug: row.id,
    kind: 'clip',
    title: row.title,
    channel: row.creator,
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    meta: `${formatCount(row.views)} views · ${formatAge(row.createdAt)}`,
    duration: formatDuration(row.durationSeconds)
  }
}

export function liveToRelated(row: LiveStreamRow): RelatedItem {
  return {
    id: row.id,
    slug: row.streamerName,
    kind: 'live',
    title: row.title,
    channel: row.streamerName,
    image: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    meta: `${formatCount(row.viewerCount)} watching`
  }
}
