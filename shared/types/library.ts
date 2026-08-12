import type { RelatedItem } from './watch'

/**
 * A clip you started and haven't finished, as the "Continue watching" rail
 * renders it.
 *
 * Extends `RelatedItem` — the shape every other video card on the site already
 * takes — so the rail can reuse `HomeVideoCard` instead of growing a
 * near-identical card that happens to draw one extra bar. `kind` is always
 * `'clip'`: a live session has no resume point (see `watch_progress`).
 */
export interface ContinueWatchingItem extends RelatedItem {
  /** Where to drop the playhead, in whole seconds. Also the `?t=` on the link. */
  positionSeconds: number
  /** How full the progress bar is, 0–100, already clamped server-side. */
  percent: number
  /** Pre-formatted tail, e.g. `"4 min left"`. */
  remaining: string
  avatarUrl: string | null
}

/**
 * A clip in the viewer's Watch later queue.
 *
 * `RelatedItem` again, plus who published it and when you saved it — the two
 * things a saved card shows that a recommendation doesn't. `kind` is always
 * `'clip'`: the queue can't hold a live session (see `watch_later`).
 */
export interface WatchLaterItem extends RelatedItem {
  /**
   * When it was saved, ISO 8601.
   *
   * Raw rather than pre-formatted, for the same reason `HistoryItem.watchedAt`
   * is: "Saved yesterday" depends on the viewer's timezone, which the server
   * doesn't know.
   */
  addedAt: string
  avatarUrl: string | null
}

/**
 * A clip this viewer gave a thumbs up — one row of `/liked`.
 *
 * `RelatedItem` again, the same vocabulary every other card speaks, plus when
 * the like happened. **Clips only**: a `reactions` row can also point at a live
 * session (`target_kind`), but a session ends, and a library page full of dead
 * links to streams that finished last month isn't a library. The session's VOD
 * is a clip and shows up here on its own.
 */
export interface LikedItem extends RelatedItem {
  /**
   * When it was liked, ISO 8601.
   *
   * Raw rather than pre-formatted, for the same reason `addedAt` above is:
   * "Liked yesterday" depends on the viewer's clock, which the server can't see.
   */
  likedAt: string
  avatarUrl: string | null
}

/** One page of liked videos. `nextCursor` is null once there are no more. */
export interface LikedPage {
  items: LikedItem[]
  nextCursor: number | null
}

/**
 * How `/liked` is ordered.
 *
 * A tuple rather than a bare union so Zod can validate `?sort=` against the
 * exact same list the UI offers — one place to add a fourth order, not two that
 * can drift apart.
 */
export const LIKED_SORTS = ['recent', 'oldest', 'popular'] as const

export type LikedSort = (typeof LIKED_SORTS)[number]

/**
 * Cards per request. A multiple of 2, 3 and 4 so the last row of the grid is
 * full at every breakpoint the page uses instead of trailing one lonely card.
 */
export const LIKED_PAGE_SIZE = 24

/** Longest accepted search term, enforced by Zod at the API boundary. */
export const LIKED_QUERY_MAX = 100

/**
 * Cards in the home page's Watch later rail.
 *
 * Ten, matching the recently-watched rail beside it: a rail is a glance at a
 * list, not the list — `/watch-later` is where the rest lives.
 */
export const WATCH_LATER_RAIL_LIMIT = 10

/** Ceiling on `?limit=` at the API boundary. The page asks for a screenful. */
export const WATCH_LATER_MAX_LIMIT = 60

/**
 * What the player sends up as it plays.
 *
 * Position and "did it finish", and nothing else — the runtime is *not* on the
 * wire. The server already has the clip row, so taking the duration from there
 * means a misreporting player (a bad manifest, a stale metadata read) can't
 * park a wrong denominator on the row that the progress bar then divides by.
 */
export interface WatchProgressUpdate {
  positionSeconds: number
  /** The player's `ended` event, not `position >= duration` — see `watch_progress`. */
  completed: boolean
}

/**
 * One playlist, without its items — what the library grid and the home rail
 * render. Item-level data comes from `PlaylistDetail`.
 */
export interface PlaylistSummary {
  id: string
  title: string
  /** Empty string when the owner didn't write one. */
  description: string
  visibility: PlaylistVisibility
  itemCount: number
  /**
   * Up to three thumbnails from the front of the list, newest position first —
   * the stacked cover a playlist card draws. Empty for a playlist with nothing
   * in it, which the card renders as a placeholder rather than a broken image.
   */
  covers: string[]
  /** Pre-formatted, e.g. `"Updated 2h ago"`. */
  updatedAt: string
}

export type PlaylistVisibility = 'private' | 'unlisted' | 'public'

/** A playlist and its clips, in playlist order — the `/playlists/[id]` page. */
export interface PlaylistDetail extends PlaylistSummary {
  items: PlaylistItem[]
  /** Whether the viewer owns it, and may therefore edit or remove from it. */
  isOwner: boolean
}

/** One row on the playlist page. `RelatedItem` again, plus its slot in the order. */
export interface PlaylistItem extends RelatedItem {
  position: number
}

/**
 * A playlist as the "Save to playlist" menu sees it: just enough to draw a
 * checkbox row, plus whether this video is already in it.
 */
export interface PlaylistMembership {
  id: string
  title: string
  visibility: PlaylistVisibility
  contains: boolean
}

/** What creating a playlist takes. Everything else has a default. */
export interface PlaylistDraft {
  title: string
  description?: string
  visibility?: PlaylistVisibility
}

/**
 * What editing one takes — every field optional, because the form may be sent
 * with only the one thing that changed. A `description` of `''` clears it.
 */
export type PlaylistPatch = Partial<PlaylistDraft>

/**
 * Which way a playlist item is being moved.
 *
 * A direction rather than a target index: reordering swaps the item with its
 * neighbour (see `movePlaylistItem`), so the server never has to trust — or
 * renumber against — an index the client worked out from a possibly stale list.
 */
export type PlaylistMove = 'up' | 'down'

/** Longest a playlist title may be — enforced by Zod at the API boundary. */
export const PLAYLIST_TITLE_MAX = 120
/** Longest a playlist description may be. */
export const PLAYLIST_DESCRIPTION_MAX = 1000
