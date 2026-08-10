import type { InfiniteData } from '@tanstack/vue-query'
import type { Short, ShortsPage } from '#shared/types/shorts'
import type { ReactionSummary, ReactionValue } from '#shared/types/watch'
import type { WatchlistItem } from '#shared/types/discovery'
import { applyReaction } from './reactions'

/** The paged cache shape `useShortsFeed` stores. */
export type ShortsFeedCache = InfiniteData<ShortsPage, number>

/**
 * Rewrite matching shorts wherever they appear in the paged cache.
 *
 * `match` is a predicate rather than an id because the two things that change
 * a short from outside are scoped differently: a reaction hits one video, a
 * follow hits every video by that channel — including ones on later pages that
 * are already loaded. Pure, so both rules are testable without vue-query.
 */
export function patchShorts(
  cache: ShortsFeedCache | undefined,
  match: (short: Short) => boolean,
  update: (short: Short) => Short
): ShortsFeedCache | undefined {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: page.items.map((short) => (match(short) ? update(short) : short))
    }))
  }
}

/**
 * Optimistic like/dislike for one short. Delegates the toggle rule to
 * `applyReaction` so the shorts rail and the watch page can't drift apart on
 * what pressing "like" twice means — only the field names differ here.
 */
export function applyShortReaction(short: Short, value: ReactionValue): Short {
  const summary: ReactionSummary = {
    likes: short.likes,
    dislikes: short.dislikes,
    mine: short.myReaction
  }
  const next = applyReaction(summary, value)
  return { ...short, likes: next.likes, dislikes: next.dislikes, myReaction: next.mine }
}

/** Short → watchlist entry, matching `clipToItem`'s `"duration · views"` meta. */
export function shortToItem(short: Short): WatchlistItem {
  return {
    id: short.id,
    kind: 'clip',
    title: short.title,
    creator: short.channel,
    meta: `${short.views} · ${short.publishedAt}`,
    image: short.posterUrl,
    videoUrl: short.videoUrl
  }
}
