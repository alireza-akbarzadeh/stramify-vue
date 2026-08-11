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

/** What the player reports back. `completed` is the player's call, not `position >= duration`. */
export interface WatchProgressUpdate {
  positionSeconds: number
  durationSeconds: number
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

/** Longest a playlist title may be — enforced by Zod at the API boundary. */
export const PLAYLIST_TITLE_MAX = 120
/** Longest a playlist description may be. */
export const PLAYLIST_DESCRIPTION_MAX = 1000
