import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { clips, follows } from '../db/schema'
import { landscapeClips, publishedClips, toClip } from './discovery'
import { MUSIC_MIN_SHELF_ITEMS, MUSIC_QUEUE_LIMIT, MUSIC_SHELF_LIMIT } from '#shared/types/music'
import type { MusicPage, MusicShelf, MusicTrack } from '#shared/types/music'

/**
 * The `/music` page, assembled from the `Music` slice of `clips`.
 *
 * **One query, sorted in memory.** Every shelf here is a different ordering of
 * the same rows — newest, most-viewed, longest, and the follows filter — so
 * four `order by` round trips would read the same page of the table four
 * times. The category is one of three enum values over a table that fills a
 * browse page, not a catalogue, so the whole slice is smaller than the union
 * of the shelves it produces. If `clips` ever outgrows that, this is the seam
 * to split: each ordering below is already standalone.
 *
 * `landscapeClips` for the reason every 16:9 surface applies it — a vertical
 * short in an `aspect-video` card is two black bars (see `server/utils/discovery.ts`).
 */
export async function selectMusicPage(userId: string | null): Promise<MusicPage> {
  const [rows, followed] = await Promise.all([
    db
      .select()
      .from(clips)
      .where(and(publishedClips, eq(clips.category, 'Music'), landscapeClips))
      .orderBy(desc(clips.createdAt)),
    selectFollowedCreators(userId)
  ])

  if (rows.length === 0) return { hero: null, queue: [], shelves: [] }

  // `rows` arrives newest-first from the query and is never re-sorted in place:
  // each ordering below copies first, so `fresh` stays the recency ordering the
  // hero fallback and the queue both depend on.
  const fresh = rows.map(toClip)
  const popular = [...rows].sort((a, b) => b.views - a.views).map(toClip)
  const sessions = [...rows].sort((a, b) => b.durationSeconds - a.durationSeconds).map(toClip)

  /**
   * Most-watched, deliberately *not* `clips.featured`.
   *
   * That column reads as an editorial pick from its name, but `toClip` treats
   * it as a liveness flag — a featured row renders its age as `"Now"` and its
   * count as `"watching"` rather than `"views"`. Seating the hero on it would
   * put "Now · 12.4k watching" under a track that isn't live. Popularity is
   * both honest here and stable: it doesn't reshuffle the page hourly the way
   * recency would on a quiet day.
   */
  const hero = popular[0]!

  const shelves = [
    shelf('fresh', 'New this week', 'The latest sets and sessions, newest first.', fresh),
    shelf('popular', 'Most played', 'What everyone has on repeat right now.', popular),
    shelf(
      'sessions',
      'Long sessions',
      'Full sets and extended takes — for when you have the evening.',
      sessions
    ),
    shelf(
      'following',
      'From artists you follow',
      'New music from the channels on your list.',
      fresh.filter((track) => followed.has(track.creator))
    )
  ].filter(keepShelf)

  return {
    hero,
    // The hero is already the biggest thing on screen; a strip that links back
    // to it would be a no-op tap.
    queue: fresh.filter((track) => track.id !== hero.id).slice(0, MUSIC_QUEUE_LIMIT),
    shelves
  }
}

function shelf(
  id: MusicShelf['id'],
  title: string,
  subtitle: string,
  items: MusicTrack[]
): MusicShelf {
  return { id, title, subtitle, items: items.slice(0, MUSIC_SHELF_LIMIT) }
}

/**
 * "New this week" always ships — a music page with one rail beats a music page
 * with none, and it's the only shelf that's meaningful at any size. The rest
 * are alternate *orderings* of those same rows, so below a few items they'd
 * repeat the first rail almost verbatim and read as a bug.
 */
function keepShelf(entry: MusicShelf): boolean {
  if (entry.items.length === 0) return false
  return entry.id === 'fresh' || entry.items.length >= MUSIC_MIN_SHELF_ITEMS
}

/**
 * The creator handles this viewer follows, as a set for O(1) membership.
 *
 * Empty for signed-out viewers rather than a query — `follows.channel` is a
 * text handle matching `clips.creator` (there's no `channels` table yet, see
 * ADR-014), so with no session there is nothing to match against and the
 * shelf simply doesn't ship.
 */
async function selectFollowedCreators(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set()

  const rows = await db
    .select({ channel: follows.channel })
    .from(follows)
    .where(eq(follows.userId, userId))

  return new Set(rows.map((row) => row.channel))
}
