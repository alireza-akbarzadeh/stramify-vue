import type { ClipCategory } from './discovery'

/**
 * How the channel directory is ordered. `top` is the default and is the only
 * one that blends signals — see `CHANNEL_RANK_SQL` in `server/utils/channels.ts`
 * for the exact formula, which is deliberately written down rather than tuned
 * by feel.
 */
export type ChannelSort = 'top' | 'followers' | 'views' | 'live' | 'new'

export const CHANNEL_SORTS: ReadonlyArray<{ value: ChannelSort; label: string }> = [
  { value: 'top', label: 'Top channels' },
  { value: 'followers', label: 'Most followers' },
  { value: 'views', label: 'Most viewed' },
  { value: 'live', label: 'Live now' },
  { value: 'new', label: 'Newest' }
]

/**
 * The bell: which of a followed channel's events are worth interrupting the
 * viewer for. Stored per follow (`follows.notify`) and read by the
 * notification feed, so each value is a real difference in what arrives:
 *
 * - `all` — every upload and every time the channel goes live. The default,
 *   because it's what the feed already did for every follow before the bell
 *   existed.
 * - `live` — going live only. For channels that publish more clips than you
 *   want pinged about.
 * - `none` — following without notifications.
 *
 * Ordered loudest-first; the menu renders it in this order.
 */
export const CHANNEL_NOTIFY_MODES = ['all', 'live', 'none'] as const

export type ChannelNotifyMode = (typeof CHANNEL_NOTIFY_MODES)[number]

/** How a channel's own video grid is ordered. */
export type ChannelVideoSort = 'latest' | 'popular' | 'oldest'

export const CHANNEL_VIDEO_SORTS: ReadonlyArray<{ value: ChannelVideoSort; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'oldest', label: 'Oldest' }
]

/** Identity fields, shared by the directory card and the full profile. */
export interface ChannelIdentity {
  /** Canonical lowercase handle — also the URL segment. */
  handle: string
  /** Display name, e.g. `Canvas Queen`. Falls back to the raw handle. */
  name: string
  tagline: string
  avatarUrl: string | null
  bannerUrl: string | null
  verified: boolean
}

/** One row of the channel directory. */
export interface ChannelListItem extends ChannelIdentity {
  /**
   * Raw, not pre-formatted like the other counts: following is the one number
   * the client changes on its own (optimistic follow), and `±1` on a raw
   * integer can't drift the way re-parsing `"12.4k"` would. Format it for
   * display with `formatCount`.
   */
  followerCount: number
  /** Pre-formatted lifetime views across every clip, e.g. `"35.5k"`. */
  totalViews: string
  clipCount: number
  /** Categories this channel actually publishes in, most-published first. */
  categories: ClipCategory[]
  isLive: boolean
  /** Title of the current live session; null when offline. */
  liveTitle: string | null
  /** Banner, or the channel's most-watched thumbnail when there's no banner. */
  previewImage: string | null
  /** Whether the signed-in user follows this channel; false when signed out. */
  isFollowing: boolean
}

/** The live session a channel is running right now, as the channel page shows it. */
export interface ChannelLiveSession {
  /** Watch-page slug — the streamer handle in its original casing. */
  slug: string
  title: string
  category: ClipCategory
  /** Pre-formatted, e.g. `"8.4k watching"`. */
  viewers: string
  /** Pre-formatted, e.g. `"3h 17m"`. */
  uptime: string
  image: string
}

/** Everything `/channel/[handle]` renders above the tabs. */
export interface ChannelProfile extends ChannelIdentity {
  bio: string
  websiteUrl: string | null
  location: string | null
  /** Pre-formatted join month, e.g. `"Joined Mar 2026"` is built from this: `"Mar 2026"`. */
  joinedAt: string
  /** Raw for the same reason as `ChannelListItem.followerCount`. */
  followerCount: number
  totalViews: string
  clipCount: number
  categories: ClipCategory[]
  live: ChannelLiveSession | null
  /** Whether the signed-in user follows this channel; false when signed out. */
  isFollowing: boolean
}
