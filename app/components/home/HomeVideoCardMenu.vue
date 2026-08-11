<script setup lang="ts">
import { Ban, Bookmark, BookmarkCheck, EllipsisVertical, Link2, UserMinus } from '@lucide/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { toast } from 'vue-sonner'
import type { HomeFeedback, HomeVideo } from '#shared/types/home'
import { toChannelDisplayName } from '#shared/utils/channel'

/**
 * The ⋮ on a home card: the actions that don't earn a permanent button.
 *
 * It sits in the meta row rather than over the thumbnail because the save
 * button is already there, and because this is also the only way to reach save
 * on a touch screen — the thumbnail button is hover-revealed, and a phone never
 * hovers.
 *
 * Always visible, unlike that save button. A hover-revealed trigger is
 * unreachable on touch, which is exactly the case this menu exists to cover;
 * muted grey until you hover it keeps it quiet on a wall of thumbnails.
 *
 * Feedback is emitted, not sent from here. Twenty-four of these render at once,
 * and each one owning a mutation would mean twenty-four copies of the same
 * cache-patching machinery; the list that owns the cache handles it once (see
 * `useHomeFeedback`).
 *
 * Motion is Track A — `data-state` classes from `tw-animate-css`, which Reka's
 * presence machine waits on before unmounting. See the `motion` skill.
 */
const props = withDefaults(
  defineProps<{
    video: HomeVideo
    saved: boolean
    /**
     * Off wherever the list isn't a recommendation — a curated mix is something
     * you opened on purpose, so "Not interested" there would be a button with
     * nothing to act on. Save and copy link still apply everywhere.
     */
    allowFeedback?: boolean
  }>(),
  { allowFeedback: true }
)
const emit = defineEmits<{
  (e: 'toggle-save'): void
  (e: 'feedback', value: HomeFeedback): void
}>()

const channelName = computed(() => toChannelDisplayName(props.video.channel))

function copyLink() {
  const link = `${window.location.origin}/watch/${encodeURIComponent(props.video.slug)}`
  navigator.clipboard
    .writeText(link)
    .then(() => toast('Link copied to clipboard', { description: link }))
    .catch(() => toast.error("Couldn't copy the link"))
}

const ITEM =
  'flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition-colors data-highlighted:bg-surface-2'
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      :aria-label="`More actions for ${video.title}`"
      class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-surface-2 data-[state=open]:text-foreground"
    >
      <EllipsisVertical class="size-4" aria-hidden="true" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="6"
        align="end"
        class="z-50 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-[0_24px_60px_-24px_var(--shadow-color)] backdrop-blur-xl duration-200 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
      >
        <DropdownMenuItem :class="ITEM" @select="emit('toggle-save')">
          <component
            :is="saved ? BookmarkCheck : Bookmark"
            class="size-4 shrink-0"
            :class="saved ? 'text-primary' : 'text-muted-foreground'"
            aria-hidden="true"
          />
          {{ saved ? 'Remove from watchlist' : 'Save to watchlist' }}
        </DropdownMenuItem>

        <DropdownMenuItem :class="ITEM" @select="copyLink">
          <Link2 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          Copy link
        </DropdownMenuItem>

        <template v-if="allowFeedback">
          <DropdownMenuSeparator class="my-1 h-px bg-border" />

          <DropdownMenuItem
            :class="ITEM"
            @select="emit('feedback', { kind: 'video', target: video.id })"
          >
            <Ban class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block font-medium">Not interested</span>
              <span class="block text-xs text-muted-foreground"> Fewer videos like this one. </span>
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            :class="ITEM"
            @select="emit('feedback', { kind: 'channel', target: video.channel })"
          >
            <UserMinus class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block font-medium">Don't recommend this channel</span>
              <span class="block truncate text-xs text-muted-foreground">
                Nothing from {{ channelName }} on your home page.
              </span>
            </span>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
