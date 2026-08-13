import { and, desc, eq, ilike, ne, or } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, liveStreams } from '../db/schema'
import { landscapeClips, publishedClips } from './discovery'
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
 *
 * This is where `unlisted` earns its existence (ADR-028): browse surfaces drop
 * unlisted and private alike, and resolution by id lets the unlisted one back
 * in. A private clip resolves for its owner only — so a creator can preview a
 * draft on the real watch page instead of a studio approximation of it — and
 * for nobody else, which is why `viewerId` defaults to "no one" and every
 * caller that doesn't care about ownership gets the stricter behaviour by
 * doing nothing.
 */
export async function resolveWatchTarget(
  slug: string,
  viewerId: string | null = null
): Promise<ResolvedTarget | null> {
  const viewable = viewerId
    ? or(ne(clips.visibility, 'private'), eq(clips.ownerId, viewerId))
    : ne(clips.visibility, 'private')

  const [clipRow] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.id, slug), viewable))
    .limit(1)
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

/**
 * Everything else in this target's category, live channels first (something
 * happening now beats a recording), each side ordered by its own popularity
 * signal. Category is the only signal available — there's no watch history or
 * recommender, and inventing a relevance score off nothing would be theatre.
 *
 * Shared by the up-next rail and by the AI picks endpoint, which asks a model
 * to *reorder* this list rather than to name videos from memory. That's the
 * whole reason it lives here instead of inside `related.get.ts`: the candidate
 * set the model chooses from has to be the same real catalogue the rail draws,
 * or the two panels start disagreeing about what exists.
 */
export async function selectRelated(
  resolved: ResolvedTarget,
  limit: number
): Promise<RelatedItem[]> {
  const { category } = resolved.target

  const [liveRows, clipRows] = await Promise.all([
    db
      .select()
      .from(liveStreams)
      .where(
        resolved.kind === 'live'
          ? and(eq(liveStreams.category, category), ne(liveStreams.id, resolved.row.id))
          : eq(liveStreams.category, category)
      )
      .orderBy(desc(liveStreams.viewerCount))
      .limit(limit),
    db
      .select()
      .from(clips)
      .where(
        and(
          publishedClips,
          eq(clips.category, category),
          landscapeClips,
          resolved.kind === 'clip' ? ne(clips.id, resolved.row.id) : undefined
        )
      )
      .orderBy(desc(clips.views))
      .limit(limit)
  ])

  return [...liveRows.map(liveToRelated), ...clipRows.map(clipToRelated)].slice(0, limit)
}
