<script setup lang="ts">
import { Bookmark, BookmarkCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { savedListName } from '@/composables/useSavedVideos'
import type { WatchlistKind } from '#shared/types/discovery'

const props = withDefaults(
  defineProps<{
    saved: boolean
    label: string
    /**
     * Which list this bookmark writes to — clips go to the account's Watch
     * later queue, live sessions to the on-device watchlist. It only shows up in
     * the accessible name, but that's the one place the button says out loud
     * where the video is about to go, so it has to be the truth.
     */
    kind?: WatchlistKind
    class?: string
  }>(),
  { kind: 'clip', class: undefined }
)
const emit = defineEmits<{ (e: 'toggle'): void }>()

const list = computed(() => savedListName(props.kind))
</script>

<template>
  <Button
    type="button"
    size="icon"
    variant="ghost"
    :aria-pressed="saved"
    :aria-label="saved ? `Remove ${label} from ${list}` : `Save ${label} to ${list}`"
    :class="
      cn(
        'size-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background',
        saved ? 'text-primary' : 'text-foreground',
        props.class
      )
    "
    @click="emit('toggle')"
  >
    <component :is="saved ? BookmarkCheck : Bookmark" />
  </Button>
</template>
