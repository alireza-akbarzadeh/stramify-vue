import type { ChannelIdentity, ChannelNotifyMode } from './channel'
import type { ClipCategory } from './discovery'
import type { HomeVideo } from './home'

/**
 * One channel the signed-in viewer follows.
 *
 * A `ChannelListItem` answers "who is worth following"; this answers "who am I
 * already following", so it drops the discovery numbers (total views, preview
 * banner) and carries the two things that only exist *because* you follow:
 * `notify` (the bell, a column on the follow row) and `followedAt`.
 */
export interface FollowedChannel extends ChannelIdentity {
  followerCount: number
  /**
   * Landscape clips only — the same set `/channel/[handle]?tab=videos` lists,
   * so the count on a shelf header matches what "See all" actually opens.
   * Shorts live in their own feed and are deliberately not counted here.
   */
  clipCount: number
  isLive: boolean
  /** Title of the current live session; `null` when offline. */
  liveTitle: string | null
  /**
   * Watch-page slug for the live session, in the streamer's own casing.
   * `null` when offline — a story circle links to the channel page instead.
   */
  liveSlug: string | null
  notify: ChannelNotifyMode
  /** ISO timestamp of the follow row, newest-first ordering key. */
  followedAt: string
  /**
   * Published something within `FOLLOWING_FRESH_DAYS`. This is *not* an
   * unread marker — nothing tracks what you've already watched — so the UI
   * says "new this week", which is exactly what the flag means.
   */
  hasNew: boolean
  categories: ClipCategory[]
}

/** The channel a shelf belongs to, narrowed to what its header renders. */
export interface FollowingShelfChannel {
  handle: string
  name: string
  avatarUrl: string | null
  verified: boolean
  /** Landscape clips this channel has published, and the shelf's sort key. */
  clipCount: number
  isLive: boolean
}

/** One channel's row of videos on `/following`. */
export interface FollowingShelf {
  channel: FollowingShelfChannel
  videos: HomeVideo[]
}

/** Videos per shelf. Ten is a full row on desktop and a long swipe on a phone. */
export const FOLLOWING_SHELF_SIZE = 10

/**
 * How many channels get their own shelf.
 *
 * Capped because the page is a scroll, not a database dump — following sixty
 * channels would otherwise mean six hundred cards and a first paint measured
 * in seconds. The channels that miss the cut are still one tap away from the
 * story rail and the manage list, both of which show every follow.
 */
export const FOLLOWING_SHELF_LIMIT = 8

/** How recent an upload has to be to light a channel's story ring. */
export const FOLLOWING_FRESH_DAYS = 7
