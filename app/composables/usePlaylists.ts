import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { movedPlaylistItems } from '#shared/utils/library'
import type {
  PlaylistDetail,
  PlaylistDraft,
  PlaylistMove,
  PlaylistPatch,
  PlaylistSummary
} from '#shared/types/library'

export const PLAYLISTS_KEY = ['playlists']

/** The detail query's key. Exported so the mutations below can invalidate it. */
export function playlistKey(id: string) {
  return ['playlist', id]
}

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
    enabled: computed(() => !!toValue(id)),
    queryFn: () => $fetch<PlaylistDetail>(`/api/playlists/${encodeURIComponent(toValue(id))}`)
  })
}

/**
 * Rename a playlist, or change its description or visibility.
 *
 * Both caches are invalidated: the library grid draws the title and the lock
 * icon, and the detail page draws all three, so refreshing only the one the
 * edit was launched from would leave the other showing the old name.
 */
export function useUpdatePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PlaylistPatch }) =>
      $fetch<PlaylistSummary>(`/api/playlists/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch
      }),

    onSuccess: async (_updated, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PLAYLISTS_KEY }),
        queryClient.invalidateQueries({ queryKey: playlistKey(id) })
      ])
    }
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
    // Explicit response generic — see the note in `useContinueWatching`.
    mutationFn: (id: string) =>
      $fetch<{ deleted: boolean }>(`/api/playlists/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),

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
    mutationFn: (clipId: string) =>
      $fetch<{ removed: boolean }>(
        `/api/playlists/${encodeURIComponent(toValue(playlistId))}/items/${encodeURIComponent(clipId)}`,
        { method: 'DELETE' }
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: playlistKey(toValue(playlistId)) }),
        queryClient.invalidateQueries({ queryKey: PLAYLISTS_KEY })
      ])
    }
  })
}

/**
 * Move a video one slot up or down.
 *
 * Optimistic, and it has to be: reordering is a direct-manipulation gesture, so
 * a row that only moves once the server answers reads as a dropped click and
 * invites a second press. The swap mirrors the server's — neighbours trade
 * places — and `onSettled` refetches so the stored positions, which the client
 * never computes, come back authoritative either way.
 */
export function useMovePlaylistItem(playlistId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clipId, direction }: { clipId: string; direction: PlaylistMove }) =>
      $fetch<{ moved: boolean }>(
        `/api/playlists/${encodeURIComponent(toValue(playlistId))}/items/${encodeURIComponent(clipId)}`,
        { method: 'PATCH', body: { direction } }
      ),

    onMutate: async ({ clipId, direction }) => {
      const key = playlistKey(toValue(playlistId))
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<PlaylistDetail>(key)

      queryClient.setQueryData<PlaylistDetail>(key, (detail) => {
        if (!detail) return detail
        const items = movedPlaylistItems(detail.items, clipId, direction)
        // Same reference back when the move was a no-op — see `movedPlaylistItems`.
        return items === detail.items ? detail : { ...detail, items }
      })

      return { previous, key }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
    },

    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: playlistKey(toValue(playlistId)) })
  })
}
