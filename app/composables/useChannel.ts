import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type {
  ChannelListItem,
  ChannelNotifyMode,
  ChannelProfile,
  ChannelSort,
  ChannelVideoSort
} from '#shared/types/channel'
import type { Clip, ClipCategory } from '#shared/types/discovery'
import type { ChannelSummary } from '#shared/types/watch'
import { toChannelHandle } from '#shared/utils/channel'
import { NOTIFICATIONS_KEY } from './useNotifications'

export interface ChannelFilters {
  sort: ChannelSort
  search: string
  category: ClipCategory | null
}

/** Cache keys, in one place — the follow mutation has to patch three of them. */
const keys = {
  directory: (filters: ChannelFilters) => ['channels', 'directory', filters] as const,
  profile: (handle: string) => ['channel', 'profile', handle] as const,
  summary: (handle: string) => ['channel', handle] as const
}

/**
 * The ranked channel directory. Sorting and filtering happen server-side, so a
 * sort change is a new request — `keepPreviousData` holds the current grid on
 * screen while it lands instead of flashing the skeleton back.
 */
export function useChannelDirectory(filters: MaybeRefOrGetter<ChannelFilters>) {
  const current = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => keys.directory(current.value)),
    queryFn: () =>
      $fetch<ChannelListItem[]>('/api/channels', {
        query: {
          sort: current.value.sort,
          q: current.value.search || undefined,
          category: current.value.category ?? undefined
        }
      }),
    placeholderData: keepPreviousData
  })
}

/**
 * One channel's identity and stats. `retry: false` so an unknown handle
 * surfaces its 404 immediately — the page renders a "no such channel" state
 * off it rather than spinning through three retries first.
 */
export function useChannelProfile(handle: MaybeRefOrGetter<string>) {
  const key = computed(() => toChannelHandle(toValue(handle)))
  return useQuery({
    queryKey: computed(() => keys.profile(key.value)),
    queryFn: () => $fetch<ChannelProfile>(`/api/channels/${encodeURIComponent(key.value)}/profile`),
    enabled: computed(() => !!key.value),
    retry: false
  })
}

/** A channel's clips in the order the tab asked for. */
export function useChannelVideos(
  handle: MaybeRefOrGetter<string>,
  sort: MaybeRefOrGetter<ChannelVideoSort>
) {
  const key = computed(() => toChannelHandle(toValue(handle)))
  const order = computed(() => toValue(sort))
  return useQuery({
    queryKey: computed(() => ['channel', 'videos', key.value, order.value]),
    queryFn: () =>
      $fetch<Clip[]>(`/api/channels/${encodeURIComponent(key.value)}/videos`, {
        query: { sort: order.value }
      }),
    enabled: computed(() => !!key.value),
    placeholderData: keepPreviousData
  })
}

/**
 * Follow state for one channel in the compact shape the watch-page header
 * needs: follower count, button state, and a toggle that takes no argument.
 *
 * The key is the canonical handle, not the raw creator name, so the watch page
 * (`Canvas_Queen`) and the channel page (`canvas_queen`) share one cache entry
 * and can't disagree about whether you follow.
 */
export function useChannelFollow(name: MaybeRefOrGetter<string>) {
  const handle = computed(() => toChannelHandle(toValue(name)))
  const query = useQuery({
    queryKey: computed(() => keys.summary(handle.value)),
    queryFn: () => $fetch<ChannelSummary>(`/api/channels/${encodeURIComponent(handle.value)}`),
    enabled: computed(() => !!handle.value)
  })
  const follow = useFollowChannel()
  const notify = useChannelNotify()

  return {
    channel: computed(() => query.data.value ?? null),
    toggle: { mutate: () => follow.mutate(handle.value), isPending: follow.isPending },
    notify: {
      mutate: (mode: ChannelNotifyMode, options?: Parameters<typeof notify.mutate>[1]) =>
        notify.mutate({ name: handle.value, mode }, options),
      isPending: notify.isPending
    }
  }
}

/**
 * Set the bell for a followed channel.
 *
 * Only the summary cache carries `notify`, so unlike the follow toggle there's
 * one place to patch. The patch is optimistic because the menu closes on the
 * click and a bell that snapped back a beat later would read as a bug; a
 * failure restores the previous mode rather than leaving a lie on screen.
 *
 * The feed itself is invalidated on success — muting a channel changes which
 * rows the bell dropdown is allowed to show, and that's decided server-side.
 */
export function useChannelNotify() {
  const client = useQueryClient()
  const key = (name: string) => keys.summary(toChannelHandle(name))

  return useMutation({
    mutationFn: ({ name, mode }: { name: string; mode: ChannelNotifyMode }) =>
      $fetch<ChannelSummary>(`/api/channels/${encodeURIComponent(toChannelHandle(name))}/notify`, {
        method: 'POST',
        body: { mode }
      }),
    onMutate: ({ name, mode }) => {
      const previous = client.getQueryData<ChannelSummary>(key(name))
      if (previous) client.setQueryData(key(name), { ...previous, notify: mode })
      return { previous }
    },
    onSuccess: (summary, { name }) => {
      client.setQueryData(key(name), summary)
      client.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
    onError: (_error, { name }, context) => {
      if (context?.previous) client.setQueryData(key(name), context.previous)
    }
  })
}

/** Toggle one cached record's follow state, moving its count by exactly one. */
function toggleFollow<T extends { isFollowing: boolean; followerCount: number }>(record: T): T {
  return {
    ...record,
    isFollowing: !record.isFollowing,
    followerCount: Math.max(0, record.followerCount + (record.isFollowing ? -1 : 1))
  }
}

/**
 * Follow/unfollow any channel, from anywhere.
 *
 * The same channel can be on screen in three shapes at once — the watch page's
 * header summary, the channel page's profile, and a row in the directory — so
 * one toggle patches all three caches instead of leaving two of them stale.
 *
 * The patch is optimistic and deliberately isn't reconciled against the
 * response: the viewer is the only actor who can change *their own* follow
 * state, so `±1` is exact. A concurrent follow by someone else moves the total,
 * but that's a number this page never claimed was live. Failures roll the
 * caches back by invalidating them.
 */
export function useFollowChannel() {
  const client = useQueryClient()

  const patch = (handle: string) => {
    client.setQueriesData<ChannelListItem[]>({ queryKey: ['channels', 'directory'] }, (list) =>
      list?.map((item) => (item.handle === handle ? toggleFollow(item) : item))
    )
    client.setQueryData<ChannelProfile>(keys.profile(handle), (profile) =>
      profile ? toggleFollow(profile) : profile
    )
  }

  return useMutation({
    mutationFn: (name: string) =>
      $fetch<ChannelSummary>(`/api/channels/${encodeURIComponent(toChannelHandle(name))}/follow`, {
        method: 'POST'
      }),
    onMutate: (name) => patch(toChannelHandle(name)),
    // The watch page's header reads the summary shape, which the server just
    // recomputed — take it verbatim rather than re-deriving it here.
    onSuccess: (summary, name) => client.setQueryData(keys.summary(toChannelHandle(name)), summary),
    onError: (_error, name) => {
      const handle = toChannelHandle(name)
      client.invalidateQueries({ queryKey: ['channels', 'directory'] })
      client.invalidateQueries({ queryKey: keys.profile(handle) })
    }
  })
}
