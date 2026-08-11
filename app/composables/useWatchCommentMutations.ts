import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { QueryKey } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { CommentDraft, WatchComment } from '#shared/types/watch'
import { applyCommentLike, insertComment, mapComment, removeComment } from '@/utils/comments'

type Thread = WatchComment[]
type Snapshot = [QueryKey, Thread | undefined][]

interface LikeResult {
  likes: number
  likedByMe: boolean
}

/**
 * Posting, replying, liking and deleting comments for one clip.
 *
 * Every write patches *all* cached sorts for this slug at once, not just the
 * one on screen: Top and Newest are separate cache entries (see
 * `useWatchComments`), so updating only the active one would leave a deleted
 * comment sitting in the other, ready to reappear on the next tab click.
 *
 * Likes and deletes are optimistic and roll back the whole snapshot on
 * failure. Posting isn't — the new comment needs the server's id before it can
 * be replied to or deleted, and a row that can't be acted on yet is worse than
 * a brief spinner.
 */
export function useWatchCommentMutations(slug: MaybeRefOrGetter<string>) {
  const key = computed(() => toValue(slug))
  const client = useQueryClient()
  const scope = computed(() => ['watch', 'comments', key.value])
  const base = computed(() => `/api/watch/${encodeURIComponent(key.value)}/comments`)

  function patch(fn: (list: Thread) => Thread) {
    client.setQueriesData<Thread>({ queryKey: scope.value }, (list) => (list ? fn(list) : list))
  }
  function snapshot(): Snapshot {
    return client.getQueriesData<Thread>({ queryKey: scope.value })
  }
  function restore(previous: Snapshot | undefined) {
    for (const [entry, data] of previous ?? []) client.setQueryData(entry, data)
  }

  const post = useMutation({
    mutationFn: (draft: CommentDraft) =>
      $fetch<WatchComment>(base.value, { method: 'POST', body: draft }),
    onSuccess: (created, draft) => patch((list) => insertComment(list, created, draft.parentId ?? null))
  })

  const like = useMutation({
    mutationFn: (id: string) =>
      $fetch<LikeResult>(`${base.value}/${encodeURIComponent(id)}/like`, { method: 'POST' }),
    onMutate: (id) => {
      const previous = snapshot()
      patch((list) => mapComment(list, id, applyCommentLike))
      return { previous }
    },
    onSuccess: (result, id) =>
      patch((list) => mapComment(list, id, (comment) => ({ ...comment, ...result }))),
    onError: (_error, _id, context) => restore(context?.previous)
  })

  const remove = useMutation({
    // Response generic spelled out: without it Nuxt's typed `$fetch` infers the
    // body by matching this interpolated path against every route in the app,
    // which blows TypeScript's instantiation depth limit. Every other dynamic
    // call in this file already passes one.
    mutationFn: (id: string) =>
      $fetch<{ deleted: boolean }>(`${base.value}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),
    onMutate: (id) => {
      const previous = snapshot()
      patch((list) => removeComment(list, id))
      return { previous }
    },
    onError: (_error, _id, context) => restore(context?.previous)
  })

  return { post, like, remove }
}
