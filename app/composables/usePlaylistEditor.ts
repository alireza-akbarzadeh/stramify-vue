import { toast } from 'vue-sonner'
import { useUpdatePlaylist } from './usePlaylists'
import type { PlaylistPatch, PlaylistSummary } from '#shared/types/library'

/**
 * The "edit this playlist" dialog's state, in one place.
 *
 * Both surfaces that can rename a playlist — the library grid's card menu and
 * the detail page header — need the same three things: which playlist is being
 * edited, whether the dialog is up, and what to do on submit. Keeping that here
 * means one shared `PlaylistFormDialog` per page instead of one per card, and
 * neither page's `<script setup>` grows a copy of the same mutation wiring.
 *
 * The dialog stays open on failure so the edit isn't lost — closing it only on
 * success is what makes the toast the whole confirmation.
 */
export function usePlaylistEditor() {
  const update = useUpdatePlaylist()
  const target = ref<PlaylistSummary | null>(null)
  const open = ref(false)

  function edit(playlist: PlaylistSummary) {
    target.value = playlist
    open.value = true
  }

  function submit(patch: PlaylistPatch) {
    const id = target.value?.id
    if (!id) return

    update.mutate(
      { id, patch },
      {
        onSuccess: (updated) => {
          open.value = false
          toast.success(`Saved "${updated.title}"`)
        },
        onError: () => toast.error("Couldn't save those changes.")
      }
    )
  }

  return { open, target, edit, submit, pending: update.isPending }
}
