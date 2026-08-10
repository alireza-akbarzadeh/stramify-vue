import type { ChannelNotifyMode } from './channel'
import type { ClipCategory } from './discovery'

/**
 * The two things you can land on at `/watch/[slug]`. Discriminated on `kind`
 * so the page can branch once at the top instead of null-checking every
 * live-only field: a VOD has a publish date and a final view count, a live
 * session has an uptime and a count that's only true right now.
 *
 * `slug` is what the URL carries — `clips.id` for a clip, `streamer_name`
 * for a live channel (see `server/utils/watch.ts` for why those namespaces
 * can't collide).
 */
export type WatchTarget = WatchClip | WatchLive

export interface WatchTargetBase {
  id: string
  slug: string
  title: string
  /** Channel handle — `clips.creator` / `live_streams.streamer_name`. */
  channel: string
  category: ClipCategory
  description: string
  image: string
  videoUrl: string
}

export interface WatchClip extends WatchTargetBase {
  kind: 'clip'
  /** Pre-formatted, e.g. `"12.4k views"`. */
  views: string
  /** Pre-formatted relative publish date, e.g. `"3h ago"`. */
  publishedAt: string
  /** Pre-formatted runtime, e.g. `"02:45"`. */
  duration: string
}

export interface WatchLive extends WatchTargetBase {
  kind: 'live'
  /** Pre-formatted, e.g. `"8.4k watching"`. */
  viewers: string
  /** How long the session has been up, e.g. `"3h 17m"`. */
  uptime: string
}

/** One entry in the up-next rail. Covers both kinds — `live` drives the badge. */
export interface RelatedItem {
  id: string
  slug: string
  kind: 'clip' | 'live'
  title: string
  channel: string
  image: string
  videoUrl: string
  /** Secondary line, e.g. `"12.4k views · 3h ago"` or `"8.4k watching"`. */
  meta: string
  /** Only set for clips — rendered as the thumbnail's corner chip. */
  duration?: string
}

/**
 * A comment on a clip. `userId` is null for seeded rows; `authorName` is
 * always present so the list renders identically either way.
 *
 * `likes` is the seeded baseline plus real `comment_likes` rows, so a comment
 * written in the app starts at 0 and counts up honestly. `likedByMe` and
 * `isMine` are always false when signed out — the UI reads them to decide
 * which affordances to show, but the server re-checks ownership on delete.
 */
export interface WatchComment {
  id: string
  authorName: string
  authorImage: string | null
  body: string
  likes: number
  likedByMe: boolean
  isMine: boolean
  /** Pre-formatted relative time, e.g. `"2h ago"`. */
  age: string
  replies: WatchComment[]
}

export type CommentSort = 'new' | 'top'

/** What the composer sends. `parentId` set = a reply, one level deep only. */
export interface CommentDraft {
  body: string
  parentId?: string | null
}

/** One live-chat line. Flat by design — chat has no threading. */
export interface ChatMessage {
  id: string
  authorName: string
  body: string
  /** ISO timestamp — the client formats it and uses it as the `?since=` cursor. */
  createdAt: string
}

/** Like/dislike totals plus what the current session picked (null when signed out). */
export interface ReactionSummary {
  likes: number
  dislikes: number
  mine: ReactionValue | null
}

export type ReactionValue = 'like' | 'dislike'

/** Channel header data. There's no `channels` table — this is derived, see ADR-014. */
export interface ChannelSummary {
  /** The handle, which is also the identity: `follows.channel` stores this. */
  name: string
  /** Pre-formatted, e.g. `"12.4k"`. */
  followers: string
  /** Whether the signed-in user follows this channel; false when signed out. */
  isFollowing: boolean
  /** Total clips published by this channel. */
  clipCount: number
  /**
   * Bell state for this follow. `none` when not following — there's nothing to
   * notify about a channel you don't follow, so the two can't disagree.
   */
  notify: ChannelNotifyMode
}
