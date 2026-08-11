import type { CategorySlug, ClipCategory } from './discovery'
import type { RelatedItem } from './watch'

/**
 * Why a video is in the recommended feed.
 *
 * Ranked by precedence, not by strength: a video from a channel you follow is
 * labelled `'following'` even if it is also live, because that is the reason
 * *you* are seeing it. `null` means popularity alone put it there — the common
 * case, and the card shows no line rather than dressing it up as a reason.
 */
export type HomeReason = 'following' | 'live' | 'new'

/**
 * One card in the home feed. A `RelatedItem` (the shape the up-next rail and
 * search results already render) plus the two things a home grid card shows
 * that a list row doesn't: the channel's avatar and why this is here.
 */
export interface HomeVideo extends RelatedItem {
  category: ClipCategory
  /** `null` for a channel with no `channels` row — the avatar falls back to an initial. */
  avatarUrl: string | null
  reason: HomeReason | null
}

/**
 * One page of the recommended feed. `nextCursor` is `null` on the last page,
 * which is what stops the infinite query rather than a total count — the feed
 * is ranked, and a total would only be useful if you could jump to page 9.
 */
export interface HomeFeedPage {
  items: HomeVideo[]
  nextCursor: number | null
}

/**
 * One filter chip above the feed. `id` is what the UI tracks and what goes on
 * the wire; `category` and `live` are the actual filter this chip stands for,
 * so the request never has to parse the label back into a query.
 */
export interface HomeChip {
  id: string
  label: string
  category: CategorySlug | null
  /** `true` for the "Live" chip — restricts the feed to sessions on air now. */
  live: boolean
}

/** Cards per page. Divides evenly by 2, 3 and 4, so no ragged last row at any breakpoint. */
export const HOME_PAGE_SIZE = 24

/**
 * What a piece of negative feedback applies to: this one video ("Not
 * interested"), or everything by its channel ("Don't recommend this channel").
 */
export const HOME_FEEDBACK_KINDS = ['video', 'channel'] as const
export type HomeFeedbackKind = (typeof HOME_FEEDBACK_KINDS)[number]

/**
 * One thing the viewer has asked the feed to stop showing.
 *
 * `target` is a `HomeVideo.id` for `'video'` and a channel handle for
 * `'channel'`. The server canonicalises the handle's casing and echoes the
 * stored row back, so the client's undo always refers to the same row.
 */
export interface HomeFeedback {
  kind: HomeFeedbackKind
  target: string
}
