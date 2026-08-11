import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { PLAYLISTS_KEY } from './usePlaylists'
import type { PlaylistMembership } from '#shared/types/library'

function membershipsKey(slug: string) {
  return ['watch', slug, 'playlists']
}

/**
 * Which of the viewer's playlists already hold this video — the checkbox state
 * in the "Save to playlist" menu.
 *
 * Keyed on the watch slug rather than the clip id because that's what the page
 * has; the endpoint resolves it. Disabled signed out, where the menu shows a
 * sign-in prompt instead of a list.
 */
export function usePlaylistMemberships(slug: MaybeRefOrGetter<string>) {
  const auth = useAuthStore()

  return useQuery({
    queryKey: computed(() => membershipsKey(toValue(slug))),
    enabled: computed(() => auth.isAuthenticated && !!toValue(slug)),
    queryFn: () =>
      $fetch<PlaylistMembership[]>(
        `/api/watch/${encodeURIComponent(toValue(slug))}/playlists`
      )
  })
}

/**
 * Toggle this video's membership of one playlist.
 *
 * Optimistic: a checkbox that waits for a round trip before it ticks feels
 * broken, and both endpoints are idempotent, so a rapid double-toggle can't
 * leave the server somewhere the UI can't describe. The clip id comes from the
 * server on the way back in — the menu only ever knows the slug — so the
 * playlist summaries are invalidated afterwards to pick up the new counts.
 */
export function useTogglePlaylistMembership(
  slug: MaybeRefOrGetter<string>,
  clipId: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    // The two branches return different bodies (`{ removed }` vs `{ added }`)
    // and neither is read, so the result is dropped rather than widened into a
    // union the mutation's generic can't name. The URLs are annotated `string`
    // for the same reason as in `useContinueWatching`: an interpolated literal
    // path blows Nuxt's typed-route instantiation depth.
    mutationFn: async ({
      playlistId,
      contains
    }: {
      playlistId: string
      contains: boolean
    }): Promise<void> => {
      const base: string = `/api/playlists/${encodeURIComponent(playlistId)}/items`

      if (contains) {
        const url: string = `${base}/${encodeURIComponent(toValue(clipId))}`
        await $fetch(url, { method: 'DELETE' })
        return
      }

      await $fetch(base, { method: 'POST', body: { clipId: toValue(clipId) } })
    },

    onMutate: async ({ playlistId, contains }) => {
      const key = membershipsKey(toValue(slug))
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<PlaylistMembership[]>(key)

      queryClient.setQueryData<PlaylistMembership[]>(key, (items) =>
        (items ?? []).map((item) =>
          item.id === playlistId ? { ...item, contains: !contains } : item
        )
      )
      return { previous, key }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
    },

    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLAYLISTS_KEY })
  })
}
