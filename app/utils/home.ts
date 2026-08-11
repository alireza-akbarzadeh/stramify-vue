import type { InfiniteData } from '@tanstack/vue-query'
import type { HomeFeedPage, HomeFeedback, HomeVideo } from '#shared/types/home'
import { toChannelHandle, toChannelTag } from '#shared/utils/channel'

/** The paged cache shape `useHomeFeed` stores, one entry per filter chip. */
export type HomeFeedCache = InfiniteData<HomeFeedPage, number>

/**
 * Does this feedback hide that video?
 *
 * The client-side mirror of the `not exists` clause in
 * `server/utils/feedback.ts` — the server decides what a later page contains,
 * this decides what disappears the instant the menu item is pressed. Channels
 * compare as handles because the card renders the creator's own casing while
 * the feedback carries the canonical one.
 */
export function isSuppressed(feedback: HomeFeedback, video: HomeVideo): boolean {
  return feedback.kind === 'channel'
    ? toChannelHandle(video.channel) === toChannelHandle(feedback.target)
    : video.id === feedback.target
}

/**
 * Drop every hidden video from a paged feed cache.
 *
 * Every loaded page is filtered, not just the one the card was on: "Don't
 * recommend this channel" has to take its other videos with it, including ones
 * already scrolled past. Pure, so the rule is testable without vue-query.
 */
export function dropFromHomeFeed(
  cache: HomeFeedCache | undefined,
  feedback: HomeFeedback
): HomeFeedCache | undefined {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: page.items.filter((video) => !isSuppressed(feedback, video))
    }))
  }
}

/** The same filter for the subscriptions rail, which is a plain list. */
export function dropFromFollowing(
  videos: HomeVideo[] | undefined,
  feedback: HomeFeedback
): HomeVideo[] | undefined {
  return videos?.filter((video) => !isSuppressed(feedback, video))
}

/**
 * What the confirmation toast says.
 *
 * Derived from the feedback rather than the card, so the message survives the
 * card being unmounted the moment it's hidden. Both name a consequence instead
 * of thanking the viewer: the card just vanished, and the toast's job is to say
 * what that did — the Undo next to it says it's reversible.
 */
export function feedbackMessage(feedback: HomeFeedback): string {
  return feedback.kind === 'channel'
    ? `You won't see ${toChannelTag(feedback.target)} on your home page.`
    : "Got it — we'll show fewer videos like this."
}
