<script setup lang="ts">
import { Lock, MoreVertical, Pencil, Trash2 } from '@lucide/vue'
import CoverStack from '@/components/CoverStack.vue'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { playlistCountLabel } from '#shared/utils/library'
import type { PlaylistSummary } from '#shared/types/library'

/**
 * One playlist in the library grid or the home rail.
 *
 * The delete path is an `AlertDialog`, not a bare menu item: deleting cascades
 * to every item in the list and there's no undo, so it's the one action here
 * that has to be confirmed. Editing isn't confirmed, because it's reversible by
 * editing again. The menu itself is optional chrome — pass `deletable: false`
 * (the home rail) to render the card as a plain link.
 *
 * `edit` is emitted rather than handled here: the form dialog is owned by the
 * library, so opening one shared dialog beats mounting a copy per card.
 */
const props = defineProps<{ playlist: PlaylistSummary; deletable?: boolean }>()
defineEmits<{ (e: 'delete'): void; (e: 'edit'): void }>()

const to = computed(() => `/playlists/${encodeURIComponent(props.playlist.id)}`)
const count = computed(() => playlistCountLabel(props.playlist.itemCount))
</script>

<template>
  <article class="group relative">
    <NuxtLink
      :to="to"
      class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CoverStack
        :covers="playlist.covers"
        :count="playlist.itemCount"
        :alt="playlist.title"
      />

      <div class="mt-3 pr-8">
        <h3
          class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
        >
          {{ playlist.title }}
        </h3>
        <p class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock v-if="playlist.visibility === 'private'" class="size-3" aria-hidden="true" />
          <span>{{ count }} · {{ playlist.updatedAt }}</span>
        </p>
      </div>
    </NuxtLink>

    <!-- Outside the anchor: a button nested in a link swallows the navigation. -->
    <DropdownMenu v-if="deletable">
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="absolute right-1 top-4 size-8 rounded-full bg-background/80 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          :aria-label="`More options for ${playlist.title}`"
        >
          <MoreVertical class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @select="$emit('edit')">
          <Pencil class="size-4" />
          Edit
        </DropdownMenuItem>

        <AlertDialog>
          <AlertDialogTrigger as-child>
            <!-- `@select.prevent` keeps the menu from closing before the
                 confirmation mounts, which would unmount the dialog with it. -->
            <DropdownMenuItem variant="destructive" @select.prevent>
              <Trash2 class="size-4" />
              Delete playlist
            </DropdownMenuItem>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{{ playlist.title }}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the playlist and its {{ count.toLowerCase() }}. The videos
                themselves aren't affected. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction @click="$emit('delete')">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  </article>
</template>
