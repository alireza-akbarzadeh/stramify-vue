<script lang="ts" setup>
import {Ban, Bookmark, BookmarkCheck, EllipsisVertical, Link2, UserMinus,} from '@lucide/vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {toast} from 'vue-sonner'
import {savedListName} from '@/composables/useSavedVideos'
import type {HomeFeedback, HomeVideo} from '#shared/types/home'
import {toChannelDisplayName} from '#shared/utils/channel'

const props = withDefaults(
    defineProps<{
      video: HomeVideo
      saved: boolean
      allowFeedback?: boolean
    }>(),
    {
      allowFeedback: true,
    },
)

const emit = defineEmits<{
  'toggle-save': []
  feedback: [value: HomeFeedback]
}>()

const channelName = computed(() =>
    toChannelDisplayName(props.video.channel),
)

/**
 * One save action, not two. This menu used to offer "Save to watchlist" *and*
 * "Save to Watch later" — two rows a sentence apart that wrote to two different
 * places, only one of which the sidebar links to. The bookmark now means the
 * account's Watch later queue for a clip and the on-device list for a live
 * session, and the label says which (see `useSavedVideos`).
 */
const saveLabel = computed(() => {
  const list = savedListName(props.video.kind)
  return props.saved ? `Remove from ${list}` : `Save to ${list}`
})

const copyLink = async () => {
  const link = `${window.location.origin}/watch/${encodeURIComponent(
      props.video.slug,
  )}`

  try {
    await navigator.clipboard.writeText(link)

    toast('Link copied to clipboard', {
      description: link,
    })
  } catch {
    toast.error("Couldn't copy the link")
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
        :aria-label="`More actions for ${video.title}`"
        as-child
    >
      <!-- 36px on touch, where this is the card's *only* visible action (the
           save button beside it is pointer-only), matching the app bar's round
           targets. 32px from `sm` up, where a cursor doesn't need the slack. -->
      <button
          class="relative z-50 grid size-9 shrink-0 touch-manipulation place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-surface-2 data-[state=open]:text-foreground sm:size-8"
          type="button"
          @pointerdown.stop
          @click.stop
      >
        <EllipsisVertical
            aria-hidden="true"
            class="pointer-events-none size-4"
        />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
        :side-offset="6"
        align="end"
        class="w-64"
    >
      <DropdownMenuItem @select="emit('toggle-save')">
        <component
            :is="saved ? BookmarkCheck : Bookmark"
            :class="saved ? 'text-primary' : 'text-muted-foreground'"
            class="size-4 shrink-0"
        />

        {{ saveLabel }}
      </DropdownMenuItem>

      <DropdownMenuItem @select="copyLink">
        <Link2 class="size-4 shrink-0"/>

        Copy link
      </DropdownMenuItem>

      <template v-if="allowFeedback">
        <DropdownMenuSeparator/>

        <DropdownMenuItem
            class="items-start"
            @select="
              emit('feedback', {
                kind: 'video',
                target: video.id,
              })
            "
        >
          <Ban class="mt-0.5 size-4 shrink-0"/>

          <span class="min-w-0 flex-1">
            <span class="block font-medium">
              Not interested
            </span>

            <span class="block text-xs text-muted-foreground">
              Fewer videos like this one.
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
            class="items-start"
            @select="
              emit('feedback', {
                kind: 'channel',
                target: video.channel,
              })
            "
        >
          <UserMinus class="mt-0.5 size-4 shrink-0"/>

          <span class="min-w-0 flex-1">
            <span class="block font-medium">
              Don't recommend this channel
            </span>

            <span class="block truncate text-xs text-muted-foreground">
              Nothing from {{ channelName }} on your home page.
            </span>
          </span>
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
