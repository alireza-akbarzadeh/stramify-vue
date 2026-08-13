<script lang="ts" setup>
import {Ban, Bookmark, BookmarkCheck, Clock, EllipsisVertical, Link2, UserMinus,} from '@lucide/vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {toast} from 'vue-sonner'
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
  'save-later': []
  feedback: [value: HomeFeedback]
}>()

const channelName = computed(() =>
    toChannelDisplayName(props.video.channel),
)

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

const ITEM =
    'flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition-colors data-highlighted:bg-surface-2'
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

    <DropdownMenuPortal>
      <DropdownMenuContent
          :side-offset="6"
          align="end"
          class="z-50 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-[0_24px_60px_-24px_var(--shadow-color)] backdrop-blur-xl"
      >
        <DropdownMenuItem
            :class="ITEM"
            @select="emit('toggle-save')"
        >
          <component
              :is="saved ? BookmarkCheck : Bookmark"
              :class="
              saved
                ? 'text-primary'
                : 'text-muted-foreground'
            "
              class="size-4 shrink-0"
          />

          {{ saved ? 'Remove from watchlist' : 'Save to watchlist' }}
        </DropdownMenuItem>

        <!-- Only for clips. A live session has no queue to sit in — it's over
             by the time "later" arrives — which is also why `watch_later` is
             keyed straight at `clips.id`. -->
        <DropdownMenuItem
            v-if="video.kind === 'clip'"
            :class="ITEM"
            @select="emit('save-later')"
        >
          <Clock
              class="size-4 shrink-0 text-muted-foreground"
          />

          Save to Watch later
        </DropdownMenuItem>

        <DropdownMenuItem
            :class="ITEM"
            @select="copyLink"
        >
          <Link2
              class="size-4 shrink-0 text-muted-foreground"
          />

          Copy link
        </DropdownMenuItem>

        <template v-if="allowFeedback">
          <DropdownMenuSeparator
              class="my-1 h-px bg-border"
          />

          <DropdownMenuItem
              :class="ITEM"
              @select="
              emit('feedback', {
                kind: 'video',
                target: video.id,
              })
            "
          >
            <Ban
                class="size-4 shrink-0 text-muted-foreground"
            />

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
              :class="ITEM"
              @select="
              emit('feedback', {
                kind: 'channel',
                target: video.channel,
              })
            "
          >
            <UserMinus
                class="size-4 shrink-0 text-muted-foreground"
            />

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
    </DropdownMenuPortal>
  </DropdownMenu>
</template>