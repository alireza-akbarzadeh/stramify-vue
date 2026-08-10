import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ChannelSummary, ReactionSummary, ReactionValue } from '#shared/types/watch'
import { toChannelHandle } from '#shared/utils/channel'
import type { ShortsFeedCache } from '@/utils/shorts'
import { applyShortReaction, patchShorts } from '@/utils/shorts'
import { SHORTS_FEED_KEY } from './useShortsFeed'

/**
 * Like/dislike and follow, written straight into the feed's paged cache.
 *
 * Both are optimistic because both are instant, deliberate presses with no
 * intermediate state worth showing — a spinner on a heart reads as a bug. The
 * response is authoritative and overwrites the prediction; a failure restores
 * the exact snapshot taken before the press rather than invalidating, which
 * would throw away every page the viewer has already scrolled through.
 */
export function useShortsActions() {
  const client = useQueryClient()
  const filter = { queryKey: SHORTS_FEED_KEY }

  /** Snapshot every page of the feed so a failed mutation can put it back. */
  const snapshot = () => client.getQueriesData<ShortsFeedCache>(filter)
  const restore = (previous: ReturnType<typeof snapshot>) => {
    previous.forEach(([key, data]) => client.setQueryData(key, data))
  }

  const react = useMutation({
    mutationFn: ({ id, value }: { id: string; value: ReactionValue }) =>
      $fetch<ReactionSummary>(`/api/watch/${encodeURIComponent(id)}/reaction`, {
        method: 'POST',
        body: { value }
      }),
    onMutate: ({ id, value }) => {
      const previous = snapshot()
      client.setQueriesData<ShortsFeedCache>(filter, (cache) =>
        patchShorts(cache, (short) => short.id === id, (short) => applyShortReaction(short, value))
      )
      return { previous }
    },
    onSuccess: (summary, { id }) => {
      client.setQueriesData<ShortsFeedCache>(filter, (cache) =>
        patchShorts(cache, (short) => short.id === id, (short) => ({
          ...short,
          likes: summary.likes,
          dislikes: summary.dislikes,
          myReaction: summary.mine
        }))
      )
    },
    onError: (_error, _variables, context) => context && restore(context.previous)
  })

  const follow = useMutation({
    mutationFn: (channel: string) =>
      $fetch<ChannelSummary>(`/api/channels/${encodeURIComponent(toChannelHandle(channel))}/follow`, {
        method: 'POST'
      }),
    // Every short by this channel flips, not just the one on screen — the same
    // Follow button is attached to all of them further down the feed.
    onMutate: (channel) => {
      const previous = snapshot()
      const handle = toChannelHandle(channel)
      client.setQueriesData<ShortsFeedCache>(filter, (cache) =>
        patchShorts(cache, (short) => toChannelHandle(short.channel) === handle, (short) => ({
          ...short,
          isFollowing: !short.isFollowing
        }))
      )
      return { previous }
    },
    onSuccess: (summary, channel) => {
      const handle = toChannelHandle(channel)
      client.setQueriesData<ShortsFeedCache>(filter, (cache) =>
        patchShorts(cache, (short) => toChannelHandle(short.channel) === handle, (short) => ({
          ...short,
          isFollowing: summary.isFollowing
        }))
      )
      // The watch page and channel directory cache the same follow under their
      // own keys; let them refetch rather than guessing at their shapes here.
      client.invalidateQueries({ queryKey: ['channel', handle] })
      client.invalidateQueries({ queryKey: ['channels', 'directory'] })
    },
    onError: (_error, _channel, context) => context && restore(context.previous)
  })

  /** Keeps the rail's comment badge honest after the sheet posts one. */
  function bumpCommentCount(id: string, by: number) {
    client.setQueriesData<ShortsFeedCache>(filter, (cache) =>
      patchShorts(cache, (short) => short.id === id, (short) => ({
        ...short,
        commentCount: Math.max(0, short.commentCount + by)
      }))
    )
  }

  return { react, follow, bumpCommentCount }
}
