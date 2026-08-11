<script setup lang="ts">
import { ListPlus, Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useCreatePlaylist } from '@/composables/usePlaylists'
import { usePlaylistMemberships, useTogglePlaylistMembership } from '@/composables/useSaveToPlaylist'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import PlaylistCreateDialog from '@/components/playlists/PlaylistCreateDialog.vue'
import type { PlaylistDraft } from '#shared/types/library'

/**
 * "Save to playlist" on the watch page — a checkbox per playlist, plus a way
 * to make a new one.
 *
 * Separate from the bookmark button beside it, and deliberately so: that one
 * is the anonymous, one-click watchlist in `stores/watchlist` (localStorage,
 * no account needed), this one writes rows against your account. Collapsing
 * them would mean either losing the signed-out save or putting a login wall in
 * front of bookmarking.
 *
 * Clips only — `playlist_items` holds clips, not live sessions — so the parent
 * doesn't render this for a stream.
 */
const props = defineProps<{ slug: string; clipId: string }>()

const auth = useAuthStore()
const { data, isPending } = usePlaylistMemberships(() => props.slug)
const toggle = useTogglePlaylistMembership(
  () => props.slug,
  () => props.clipId
)
const create = useCreatePlaylist()

const playlists = computed(() => data.value ?? [])
/** Lit when the video is in at least one list — the state the trigger reports. */
const saved = computed(() => playlists.value.some((playlist) => playlist.contains))
const createOpen = ref(false)

function onToggle(playlistId: string, contains: boolean) {
  toggle.mutate(
    { playlistId, contains },
    { onError: () => toast.error("Couldn't update that playlist.") }
  )
}

/**
 * Creating from here adds the video straight away — that's why you opened the
 * menu. The new playlist's id only exists once the server answers, so the add
 * is chained rather than optimistic.
 */
function onCreate(draft: PlaylistDraft) {
  create.mutate(draft, {
    onSuccess: (playlist) => {
      createOpen.value = false
      onToggle(playlist.id, false)
      toast.success(`Saved to "${playlist.title}"`)
    },
    onError: () => toast.error("Couldn't create that playlist.")
  })
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :class="saved ? 'bg-primary/10 text-primary hover:bg-primary/15' : undefined"
        :aria-label="saved ? 'In a playlist — change' : 'Save to a playlist'"
      >
        <ListPlus />
        Playlist
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-60">
      <template v-if="!auth.isAuthenticated">
        <DropdownMenuLabel>Save to playlist</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem as-child>
          <NuxtLink to="/login">Log in to save this</NuxtLink>
        </DropdownMenuItem>
      </template>

      <template v-else>
        <DropdownMenuLabel>Save to…</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <p v-if="isPending" class="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>
        <p
          v-else-if="!playlists.length"
          class="px-2 py-1.5 text-sm text-muted-foreground"
        >
          You don't have any playlists yet.
        </p>

        <DropdownMenuCheckboxItem
          v-for="playlist in playlists"
          :key="playlist.id"
          :model-value="playlist.contains"
          @select.prevent="onToggle(playlist.id, playlist.contains)"
        >
          <span class="truncate">{{ playlist.title }}</span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        <!-- `@select.prevent` stops the menu closing before the dialog mounts,
             which would unmount it in the same tick. -->
        <DropdownMenuItem @select.prevent="createOpen = true">
          <Plus class="size-4" />
          New playlist
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>

  <!-- Outside the menu so closing the menu doesn't take the dialog with it. -->
  <PlaylistCreateDialog
    v-model:open="createOpen"
    hide-trigger
    :pending="create.isPending.value"
    @create="onCreate"
  />
</template>
