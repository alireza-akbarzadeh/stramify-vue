import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { PlaylistDetail, PlaylistDraft, PlaylistSummary } from '#shared/types/library'

export const PLAYLISTS_KEY = ['playlists']

/**
 * The viewer's playlists.
 *
 * Gated on the session like the other personalised reads — the endpoint
 * answers `[]` signed out anyway, and skipping the request keeps a logged-out
 * home page from making one it can't use.
 */
export function usePlaylists() {
  const auth = useAuthStore()

  return useQuery({
    queryKey: PLAYLISTS_KEY,
    enabled: computed(() => auth.isAuthenticated),
    queryFn: () => $fetch<PlaylistSummary[]>('/api/playlists')
  })
}

/** One playlist and its videos. The id is part of the key, so each is cached separately. */
export function usePlaylist(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['playlist', computed(() => toValue(id))],
    queryFn: () => $fetch<PlaylistDetail>(`/api/playlists/${encodeURIComponent(toValue(id))}`)
  })
}

/**
 * Create a playlist.
 *
 * Not optimistic: the server assigns the id, and the list this lands in is
 * ordered by `updated_at`, so there's nothing meaningful to show before the
 * response arrives. Invalidating on success is enough.
 */
export function useCreatePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: PlaylistDraft) =>
      $fetch<PlaylistSummary>('/api/playlists', { method: 'POST', body: draft }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLAYLISTS_KEY })
  })
}

/**
 * Delete a playlist.
 *
 * Optimistic, because the card vanishing is the whole confirmation — but the
 * caller is expected to have confirmed first (`PlaylistCard` uses an
 * `AlertDialog`), since this cascades to the playlist's items and there is no
 * undo.
 */
export function useDeletePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    // `url: string` — an interpolated literal path blows Nuxt's typed-route
    // instantiation depth. Same note as `useContinueWatching`.
    mutationFn: (id: string) => {
      const url: string = `/api/playlists/${encodeURIComponent(id)}`
      return $fetch(url, { method: 'DELETE' })
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PLAYLISTS_KEY })
      const previous = queryClient.getQueryData<PlaylistSummary[]>(PLAYLISTS_KEY)

      queryClient.setQueryData<PlaylistSummary[]>(PLAYLISTS_KEY, (items) =>
        (items ?? []).filter((item) => item.id !== id)
      )
      return { previous }
    },

    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(PLAYLISTS_KEY, context.previous)
    }
  })
}

/**
 * Remove a video from an open playlist.
 *
 * Invalidates both the detail (the row disappears) and the summary list (the
 * count and the cover stack change) — the two views read the same rows through
 * different queries, and leaving the list stale would show a count that
 * disagrees with the page you just came from.
 */
export function useRemovePlaylistItem(playlistId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clipId: string) => {
      const url: string = `/api/playlists/${encodeURIComponent(toValue(playlistId))}/items/${encodeURIComponent(clipId)}`
      return $fetch(url, { method: 'DELETE' })
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['playlist', toValue(playlistId)] }),
        queryClient.invalidateQueries({ queryKey: PLAYLISTS_KEY })
      ])
    }
  })
}
