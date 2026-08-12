<script setup lang="ts">
import { ArrowDown, ArrowUp, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import PlaylistRow from './PlaylistRow.vue'
import type { PlaylistItem, PlaylistMove } from '#shared/types/library'

/**
 * A playlist row plus the controls only its owner gets: reorder and remove.
 *
 * The controls sit beside `PlaylistRow` rather than inside it because that row
 * is a single link, and a button nested in a link swallows the navigation —
 * the same reason `PlaylistCard` keeps its menu outside the anchor.
 *
 * Reordering is two arrows, not drag-and-drop: arrows work from the keyboard
 * and on touch without a gesture layer or a drag library, and a swap is what
 * the server does anyway (`movePlaylistItem`). The arrow at each end of the
 * list is disabled rather than hidden, so the cluster doesn't reflow as rows
 * move past it.
 *
 * Hidden until hover or keyboard focus on a pointer device, always visible
 * below `md` where there is no hover to reveal them with.
 */
defineProps<{
  item: PlaylistItem
  index: number
  owner?: boolean
  first?: boolean
  last?: boolean
}>()

defineEmits<{ (e: 'remove'): void; (e: 'move', direction: PlaylistMove): void }>()
</script>

<template>
  <div class="group relative">
    <PlaylistRow :item="item" :index="index" />

    <div
      v-if="owner"
      class="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-background/85 p-0.5 opacity-0 backdrop-blur-sm transition-opacity max-md:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 rounded-full"
        :disabled="first"
        :aria-label="`Move ${item.title} up`"
        @click="$emit('move', 'up')"
      >
        <ArrowUp class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 rounded-full"
        :disabled="last"
        :aria-label="`Move ${item.title} down`"
        @click="$emit('move', 'down')"
      >
        <ArrowDown class="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 rounded-full"
        :aria-label="`Remove ${item.title} from this playlist`"
        @click="$emit('remove')"
      >
        <X class="size-4" />
      </Button>
    </div>
  </div>
</template>
