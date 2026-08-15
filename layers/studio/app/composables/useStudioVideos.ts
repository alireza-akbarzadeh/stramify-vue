import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { StudioVideo, StudioVideoPatch } from '#shared/types/studio'

export const STUDIO_VIDEOS_KEY = ['studio', 'videos']

/** The detail query's key. Exported so the mutations below can invalidate it. */
export function studioVideoKey(id: string) {
  return ['studio', 'video', id]
}

/**
 * Everything the signed-in account has uploaded.
 *
 * Gated on the session like the other account-scoped reads — the endpoint
 * answers 401 signed out, and skipping the request keeps the studio from
 * making one it can only render as an error.
 */
export function useStudioVideos() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: STUDIO_VIDEOS_KEY,
    enabled: computed(() => auth.isAuthenticated),
    queryFn: () => $fetch<StudioVideo[]>('/api/studio/videos')
  })
}

/** One upload, for the edit page. Fetched by id so a hard load doesn't need the list. */
export function useStudioVideo(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => studioVideoKey(toValue(id))),
    enabled: computed(() => !!toValue(id)),
    queryFn: () => $fetch<StudioVideo>(`/api/studio/videos/${encodeURIComponent(toValue(id))}`)
  })
}

/**
 * Save an edit.
 *
 * Both caches are invalidated: the content table draws the title, the
 * visibility badge and the category, and the edit page draws all of them plus
 * the description — refreshing only the one the save was launched from would
 * leave the other showing what the creator just changed away from.
 *
 * Not optimistic, unlike the delete below. A save has a visible pending state
 * on its own button and settles in one round trip, so writing the change into
 * the cache first would only buy the chance to show a value the server then
 * rejected for length.
 */
export function useUpdateStudioVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: StudioVideoPatch }) =>
      $fetch<StudioVideo>(`/api/studio/videos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch
      }),

    onSuccess: async (updated, { id }) => {
      // Seed the detail cache with the response rather than refetching it —
      // the PATCH already returned the row the edit page is about to redraw.
      queryClient.setQueryData(studioVideoKey(id), updated)
      await queryClient.invalidateQueries({ queryKey: STUDIO_VIDEOS_KEY })
    }
  })
}

/**
 * Delete an upload.
 *
 * Optimistic, because the row vanishing *is* the confirmation — but the caller
 * is expected to have confirmed first (`StudioDeleteDialog` uses an
 * `AlertDialog`), since this cascades to the video's comments, reactions and
 * playlist entries, deletes the stored file, and has no undo.
 */
export function useDeleteStudioVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      $fetch<{ deleted: boolean }>(`/api/studio/videos/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: STUDIO_VIDEOS_KEY })
      const previous = queryClient.getQueryData<StudioVideo[]>(STUDIO_VIDEOS_KEY)

      queryClient.setQueryData<StudioVideo[]>(STUDIO_VIDEOS_KEY, (videos) =>
        (videos ?? []).filter((video) => video.id !== id)
      )
      return { previous }
    },

    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(STUDIO_VIDEOS_KEY, context.previous)
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: STUDIO_VIDEOS_KEY })
  })
}
