export type ClipCategory = 'Music' | 'Gaming' | 'Creative'

/**
 * Which way up a clip was shot. `vertical` is what `/shorts` serves; every
 * 16:9 surface filters to `landscape`. See `server/db/schema/clips.ts`.
 */
export type ClipOrientation = 'landscape' | 'vertical'

export interface Clip {
  id: string
  title: string
  creator: string
  category: ClipCategory
  age: string
  views: string
  duration: string
  image: string
  videoUrl: string
}

/** Pretty URL segment for a category, e.g. `Music` → `music`. */
export type CategorySlug = Lowercase<ClipCategory>

/**
 * A category page's header data. Derived at query time by grouping `clips`
 * — there is no `categories` table, the enum on `clips.category` is the
 * source of truth (3 fixed values).
 */
export interface CategorySummary {
  slug: CategorySlug
  name: ClipCategory
  /** Static editorial copy, see `#shared/utils/category`. */
  description: string
  clipCount: number
  /** Pre-formatted total view count, e.g. `"35.5k"` — matches `Clip.views`. */
  totalViews: string
  /** Thumbnail of the most-watched clip; `null` when the category has no clips. */
  previewImage: string | null
}

/** A channel that is live right now — one row of `live_streams`, formatted for display. */
export interface LiveSignal {
  id: string
  /** Streamer/channel name — the "creator" of a live session. */
  name: string
  /** Title of the current live session, e.g. "Ranked ladder push". */
  title: string
  category: ClipCategory
  /** Pre-formatted viewer count, e.g. "8.4k watching". */
  viewers: string
  /** How long the session has been live, e.g. "3h 17m". */
  uptime: string
  image: string
  videoUrl: string
}

export type WatchlistKind = 'clip' | 'live'

export interface WatchlistItem {
  id: string
  kind: WatchlistKind
  title: string
  creator: string
  /** Short secondary line shown under the title, e.g. "02:45 · 12.4k views" or "8.4k watching". */
  meta: string
  image: string
  /** Playable source (mp4/HLS). Optional so future non-playable entries still fit. */
  videoUrl?: string
}
