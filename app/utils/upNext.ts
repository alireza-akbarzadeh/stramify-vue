import type { RelatedItem } from '#shared/types/watch'
import type { WatchlistKind } from '#shared/types/discovery'

/**
 * What the Up next rail is currently narrowed to. `'all'` is the resting state,
 * not a fourth kind — it's the absence of a kind filter.
 */
export type UpNextKind = WatchlistKind | 'all'

/** One chip in the rail's filter row, in the order they're rendered. */
export const UP_NEXT_KINDS: { id: UpNextKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'clip', label: 'Clips' }
]

/**
 * Everything a search term is matched against: the title and the channel.
 *
 * `meta` is deliberately not in here. It's a pre-formatted view count and age
 * ("12.4k views · 3 days ago"), so including it would make a search for "3"
 * match every video published in the last nine days — a hit the viewer can't
 * see the reason for, which reads as a broken filter rather than a clever one.
 */
function haystack(item: RelatedItem) {
  return `${item.title} ${item.channel}`.toLowerCase()
}

/**
 * Narrow the loaded rail by free text and by kind.
 *
 * Pure, and over the twelve items already on screen (see `related.get.ts`'s
 * `LIMIT`) rather than over the catalog: the viewer can see everything being
 * filtered, so there is no request, no spinner, and no gap between typing and
 * the list settling. Searching wider is what `/search` is for, and the rail
 * quietly becoming a second search page would be a worse sidebar.
 *
 * Terms are AND-ed, not concatenated, so "nova ranked" finds nova's video
 * called "Ranked ladder push" even though those words never sit next to each
 * other in any one field. A plain substring match would find nothing there,
 * which is the single most annoying way for a search box to fail.
 */
export function filterUpNext(
  items: RelatedItem[],
  query: string,
  kind: UpNextKind
): RelatedItem[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

  return items.filter((item) => {
    if (kind !== 'all' && item.kind !== kind) return false
    if (!terms.length) return true

    const text = haystack(item)
    return terms.every((term) => text.includes(term))
  })
}

/**
 * Whether the kind chips are worth rendering at all.
 *
 * Only when the rail actually holds both — a "Live" chip over twelve clips can
 * do one thing, empty the list, and a control whose only outcome is an empty
 * state isn't a filter. The category-matched rail is often all clips, so this
 * is the common case rather than an edge one.
 */
export function upNextHasBothKinds(items: RelatedItem[]): boolean {
  return items.some((item) => item.kind === 'live') && items.some((item) => item.kind === 'clip')
}
