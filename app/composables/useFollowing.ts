import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { useFollowChannel } from './useChannel'
import { FOLLOWED_CHANNELS_KEY, FOLLOWING_SHELVES_KEY } from '@/utils/following'
import type { FollowedChannel, FollowingShelf } from '#shared/types/following'

/**
 * The two queries behind `/following`, plus the unfollow gesture the page owns.
 *
 * Both are gated on the session for the same reason as `useFollowingFeed`: the
 * endpoints answer `[]` signed out anyway, and skipping the request keeps a
 * logged-out visit at zero round trips. The store hydrates during SSR, so
 * `enabled` is right on first render instead of flipping after hydration.
 *
 * They're separate queries rather than one payload so the story rail can paint
 * as soon as the cheap channel list lands, without waiting on the shelves.
 */
export function useFollowedChannels() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: FOLLOWED_CHANNELS_KEY,
    enabled: computed(() => auth.isAuthenticated),
    queryFn: () => $fetch<FollowedChannel[]>('/api/following/channels')
  })
}

export function useFollowingShelves() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: FOLLOWING_SHELVES_KEY,
    enabled: computed(() => auth.isAuthenticated),
    queryFn: () => $fetch<FollowingShelf[]>('/api/following/shelves')
  })
}

/**
 * Unfollow from the manage list.
 *
 * The mutation itself is the shared `useFollowChannel` — one endpoint, one set
 * of cache patches, so unfollowing here can't leave the watch page or the
 * directory claiming you still follow. What this adds is the part that only
 * makes sense on a page where the row disappears: a toast that names the
 * channel, and an Undo, because the row is gone and there's nothing left to
 * click to take it back.
 */
export function useUnfollowChannel() {
  const follow = useFollowChannel()

  function unfollow(channel: FollowedChannel) {
    follow.mutate(channel.handle, {
      onSuccess: () =>
        toast(`Unfollowed ${channel.name}`, {
          action: { label: 'Undo', onClick: () => follow.mutate(channel.handle) }
        }),
      onError: () => toast.error(`Couldn't unfollow ${channel.name}.`)
    })
  }

  return { unfollow, isPending: follow.isPending }
}
