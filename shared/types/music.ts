import type { Clip } from './discovery'

/**
 * `/music` is a *view over the `Music` category*, not a second content type —
 * a track here is the same row `/clips` and `/watch` render, so it reuses
 * `Clip` rather than growing a parallel `MusicTrack` with the same nine fields
 * (CLAUDE.md rule 10). That also means `toClip` stays the single wire mapper
 * and a music card can hand its `videoUrl` straight to the hover preview.
 */
export type MusicTrack = Clip

/**
 * Which shelf a row belongs to. Every one of these is *derived from a column
 * that already exists* — recency, views, duration, and the viewer's follows —
 * so no shelf claims an editorial grouping the database can't back up.
 */
export type MusicShelfId = 'fresh' | 'popular' | 'sessions' | 'following'

/** One horizontal rail on `/music`. */
export interface MusicShelf {
  id: MusicShelfId
  title: string
  /** One line under the heading explaining what ordered this shelf. */
  subtitle: string
  items: MusicTrack[]
}

/** Everything `/music` renders, in one round trip. */
export interface MusicPage {
  /** The cinematic header. `null` only when the category is genuinely empty. */
  hero: MusicTrack | null
  /**
   * The thumbnail strip under the hero copy — the tracks queued behind it.
   * Excludes the hero itself, so the strip is never a link back to what
   * you're already looking at.
   */
  queue: MusicTrack[]
  /** Only non-empty shelves are sent, so the client never renders a bare heading. */
  shelves: MusicShelf[]
}

/** Cap per shelf. A rail is a browse surface, not a catalogue — this is ~2 screens wide. */
export const MUSIC_SHELF_LIMIT = 12

/** How many thumbnails sit under the hero copy. Five fits the strip without wrapping at `sm`. */
export const MUSIC_QUEUE_LIMIT = 5

/**
 * A shelf below this many items reads as a broken rail rather than a short one,
 * so it's dropped instead of shipped. Applies to the *derived* shelves only —
 * "New this week" always ships when the category has anything at all, because
 * an empty music page needs one shelf more than it needs a tidy rule.
 */
export const MUSIC_MIN_SHELF_ITEMS = 3
