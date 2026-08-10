import type { ClipCategory } from './discovery'
import type { ReactionValue } from './watch'

/**
 * How many shorts one page of the feed carries.
 *
 * Small on purpose: every item is a `<video>` the browser will start
 * buffering, so a 24-item page would open two dozen connections for one
 * screenful. Five is roughly "the one you're on plus a few scrolls of
 * runway", and the next page is requested well before you reach the end
 * (see `useShortsFeed`).
 */
export const SHORTS_PAGE_SIZE = 5

/**
 * One vertical clip, with everything the feed's overlay renders already
 * resolved server-side.
 *
 * The engagement fields (`likes`, `myReaction`, `commentCount`,
 * `isFollowing`) are folded into this shape rather than fetched per item:
 * the rail shows all four the moment a short scrolls into view, and four
 * round trips per slide is not a thing a feed can afford. They're written
 * back into the same cache entry by the optimistic mutations in
 * `useShortsActions`.
 */
export interface Short {
  id: string
  title: string
  /** Channel handle — `clips.creator`. */
  channel: string
  /** Channel avatar, or `null` when the channel has no `channels` row yet. */
  avatarUrl: string | null
  category: ClipCategory
  /** Empty string when the upload carried no description. */
  description: string
  videoUrl: string
  posterUrl: string
  /** Pre-formatted, e.g. `"12.4k views"`. */
  views: string
  /** Pre-formatted relative publish date, e.g. `"3h ago"`. */
  publishedAt: string
  likes: number
  dislikes: number
  /** What the signed-in viewer picked; `null` when signed out or undecided. */
  myReaction: ReactionValue | null
  commentCount: number
  /** Whether the signed-in viewer follows this channel; false when signed out. */
  isFollowing: boolean
}

/** One page of the shorts feed. `nextCursor` is `null` at the end of the feed. */
export interface ShortsPage {
  items: Short[]
  nextCursor: number | null
}
