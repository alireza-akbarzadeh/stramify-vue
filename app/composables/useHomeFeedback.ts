import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import type { HomeFeedCache } from '@/utils/home'
import { dropFromFollowing, dropFromHomeFeed, feedbackMessage } from '@/utils/home'
import type { HomeFeedback, HomeVideo } from '#shared/types/home'

/** Every filter chip's cached pages live under this prefix; all of them are filtered. */
const FEED_KEY = ['home', 'feed']
const FOLLOWING_KEY = ['home', 'following']

/**
 * "Not interested" and "Don't recommend this channel" from a card's menu.
 *
 * Optimistic, because the point of the gesture is that the card goes away —
 * a spinner on a menu item you already dismissed reads as a bug. The row is
 * dropped from every cached chip *and* the subscriptions rail, matching what
 * the server will exclude on the next request (`notSuppressed`), so scrolling
 * back to an earlier filter doesn't resurrect it.
 *
 * Undo lives on the toast rather than in the menu: once the card is gone there
 * is nothing left to click, and the toast is the only thing still on screen
 * that knows what just happened.
 */
export function useHomeFeedback() {
  const client = useQueryClient()
  const auth = useAuthStore()

  const snapshot = () => ({
    feed: client.getQueriesData<HomeFeedCache>({ queryKey: FEED_KEY }),
    following: client.getQueryData<HomeVideo[]>(FOLLOWING_KEY)
  })

  /** Put back the exact caches taken before the press — invalidating would
   *  discard every page the viewer has already loaded. */
  function restore(previous: ReturnType<typeof snapshot>) {
    previous.feed.forEach(([key, data]) => client.setQueryData(key, data))
    client.setQueryData(FOLLOWING_KEY, previous.following)
  }

  function hideEverywhere(feedback: HomeFeedback) {
    client.setQueriesData<HomeFeedCache>({ queryKey: FEED_KEY }, (cache) =>
      dropFromHomeFeed(cache, feedback)
    )
    client.setQueryData<HomeVideo[]>(FOLLOWING_KEY, (videos) => dropFromFollowing(videos, feedback))
  }

  const hide = useMutation({
    mutationFn: (feedback: HomeFeedback) =>
      $fetch<HomeFeedback>('/api/home/feedback', { method: 'POST', body: feedback }),
    onMutate: (feedback) => {
      const previous = snapshot()
      hideEverywhere(feedback)
      return { previous }
    },
    onError: (_error, _feedback, context) => context && restore(context.previous)
  })

  const undo = useMutation({
    mutationFn: (feedback: HomeFeedback) =>
      $fetch<HomeFeedback>('/api/home/feedback', { method: 'DELETE', query: feedback }),
    // Refetch rather than splice the video back in: only the server knows where
    // it ranked, and dropping it at the top would be a different feed.
    onSuccess: () => {
      client.invalidateQueries({ queryKey: FEED_KEY })
      client.invalidateQueries({ queryKey: FOLLOWING_KEY })
    },
    onError: () => toast.error("Couldn't undo that.")
  })

  /**
   * Record one piece of feedback. Signed out it stops here with an explanation
   * — there is no per-user row to write, and hiding the card locally would be a
   * preference that silently evaporates on reload.
   */
  function submit(feedback: HomeFeedback) {
    if (!auth.isAuthenticated) {
      return toast.error('Log in to tune your recommendations.')
    }
    hide.mutate(feedback, {
      onSuccess: (stored) =>
        toast(feedbackMessage(stored), {
          action: { label: 'Undo', onClick: () => undo.mutate(stored) }
        }),
      onError: () => toast.error("Couldn't save that feedback.")
    })
  }

  return { submit }
}
