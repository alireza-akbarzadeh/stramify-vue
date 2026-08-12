import type { MaybeRefOrGetter } from 'vue'
import { usePlaylist } from './usePlaylists'
import { playlistWatchHref } from '#shared/utils/library'
import type { PlaylistItem } from '#shared/types/library'

/**
 * The playlist the watch page is playing through, if any.
 *
 * `?list=<playlist id>` is the whole trigger — the same convention YouTube
 * uses, and it survives a shared link, so someone sent the URL mid-playlist
 * lands in the queue rather than on a lone clip. Without it every computed here
 * is empty and the page behaves exactly as it did before.
 *
 * Both the queue panel and `WatchView`'s auto-advance call this; TanStack Query
 * keys on the playlist id, so that's one request, not two.
 */
export function useWatchPlaylist(slug: MaybeRefOrGetter<string>) {
  const route = useRoute()

  const listId = computed(() => {
    const value = route.query.list
    return typeof value === 'string' ? value : ''
  })

  // Disabled while `listId` is empty — see `usePlaylist`'s `enabled`.
  const { data, isPending, isError } = usePlaylist(listId)

  const items = computed<PlaylistItem[]>(() => data.value?.items ?? [])
  /** Zero-based slot of the clip on screen, or `-1` if it isn't in the list. */
  const index = computed(() => items.value.findIndex((item) => item.slug === toValue(slug)))

  /**
   * The clip after this one, or `null` at the end of the list — also `null`
   * when the current clip isn't in the playlist at all (a stale link, or an
   * item removed from another tab), which is what stops auto-advance jumping
   * to the top of a list the viewer isn't actually in.
   */
  const next = computed(() => (index.value === -1 ? null : (items.value[index.value + 1] ?? null)))

  /** Links within the queue keep `?list=`, so the playlist survives each hop. */
  function hrefFor(item: PlaylistItem) {
    return playlistWatchHref(item.slug, listId.value)
  }

  return {
    /** Whether the page is in playlist context at all. */
    active: computed(() => !!listId.value),
    playlist: data,
    items,
    index,
    next,
    hrefFor,
    isPending,
    isError
  }
}
