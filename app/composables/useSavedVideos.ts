import { useWatchLaterToggle } from '@/composables/useWatchLater'
import { useWatchlistStore } from '@/stores/watchlist'
import type { WatchlistItem, WatchlistKind } from '#shared/types/discovery'

/**
 * The bookmark, everywhere it appears — grids, rails, the shorts rail, the watch
 * page's Save button.
 *
 * One composable rather than each surface reaching for a store, because the
 * bookmark has to mean one thing. It used to mean two: every card wrote to a
 * `localStorage` list behind `/watchlist` (a page no nav links to), while the
 * real, account-bound Watch later queue in the sidebar was reachable from a
 * single ⋮ entry on the home grid. Pressing the obvious button therefore saved
 * a video that never appeared where the product says saved videos go.
 *
 * So it splits by kind, which is the only split the data model actually
 * supports:
 *
 * - **clips** → `watch_later`, on the account, on every device. This is the
 *   overwhelming majority of what gets bookmarked and it's what `/watch-later`
 *   renders.
 * - **live sessions** → the local list. `watch_later` is keyed at `clips.id` and
 *   a stream has ended by the time "later" arrives, so there is nowhere on the
 *   server to put one. `/watchlist` stays the home for those.
 *
 * Callers pass the `kind` they're rendering; the ones that render a fixed kind
 * pass it as a literal, and the mixed feeds pass `video.kind` straight through.
 */
export function useSavedVideos() {
  const local = useWatchlistStore()
  const later = useWatchLaterToggle()

  /**
   * `id` + `kind` rather than the whole item: this is called once per card per
   * render, and the converters that build a `WatchlistItem` allocate an object
   * every time they run.
   */
  function isSaved(id: string, kind: WatchlistKind) {
    return kind === 'clip' ? later.isSaved(id) : local.isSaved(id)
  }

  /**
   * The full item, because the local list has nowhere else to get a title and a
   * thumbnail from — the server already has them for a clip.
   */
  function toggle(item: WatchlistItem) {
    if (item.kind === 'clip') return later.toggle(item.id)
    local.toggle(item)
  }

  return { isSaved, toggle }
}

/**
 * What the bookmark's label calls the list it saves to, so a tooltip or an
 * `aria-label` never promises the wrong destination.
 */
export function savedListName(kind: WatchlistKind) {
  return kind === 'clip' ? 'Watch later' : 'watchlist'
}
