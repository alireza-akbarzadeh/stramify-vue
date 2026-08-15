<script lang="ts" setup>
import { Copy, ExternalLink, MessageSquareText, Pencil, ThumbsUp, Trash2 } from '@lucide/vue'
import StudioVisibilityBadge from '../StudioVisibilityBadge.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { formatCount, formatDuration, formatRelativeTime } from '#shared/utils/format'
import type { StudioVideo } from '#shared/types/studio'

/**
 * One upload in the content list.
 *
 * A `<li>` in a card layout rather than a `<tr>`: the same six facts have to
 * read on a 375px phone and a wide desktop, and a real table at that width is
 * either a horizontal scroll or four columns of ellipsis. The grid below
 * reflows instead — thumbnail and title always, the counts folding under them
 * on small screens.
 *
 * Edit is a link, not a button that opens a sheet. `/studio/videos/<id>` is
 * then bookmarkable, shareable to a collaborator and survives a refresh
 * (UX: `deep-linking`), and the back button does the obvious thing.
 */
const props = defineProps<{ video: StudioVideo }>()

const emit = defineEmits<{ delete: [video: StudioVideo] }>()

const editPath = computed(() => `/studio/videos/${encodeURIComponent(props.video.id)}`)
const watchPath = computed(() => `/watch/${encodeURIComponent(props.video.id)}`)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(new URL(watchPath.value, window.location.origin).href)
    toast.success('Link copied')
  } catch {
    toast.error('Could not copy the link')
  }
}
</script>

<template>
  <li
      class="grid grid-cols-[8rem_1fr] items-start gap-x-4 gap-y-3 rounded-2xl border border-border bg-card/50 p-3 transition-colors duration-200 hover:border-foreground/15 hover:bg-card sm:grid-cols-[11rem_1fr_auto] sm:items-center sm:gap-x-5"
  >
    <NuxtLink
        :to="editPath"
        class="relative block aspect-video overflow-hidden rounded-xl border border-border bg-surface-3/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <img
          :alt="''"
          :src="video.thumbnailUrl"
          class="size-full object-cover"
          loading="lazy"
      >
      <span
          v-if="video.durationSeconds"
          class="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white"
      >
        {{ formatDuration(video.durationSeconds) }}
      </span>
    </NuxtLink>

    <div class="min-w-0">
      <NuxtLink
          :to="editPath"
          class="block truncate text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
      >
        {{ video.title }}
      </NuxtLink>

      <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {{ video.description || 'No description' }}
      </p>

      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <StudioVisibilityBadge :visibility="video.visibility"/>
        <span class="tabular-nums">{{ formatCount(video.views) }} views</span>
        <span class="inline-flex items-center gap-1 tabular-nums">
          <ThumbsUp aria-hidden="true" class="size-3.5"/>{{ formatCount(video.likes) }}
        </span>
        <span class="inline-flex items-center gap-1 tabular-nums">
          <MessageSquareText aria-hidden="true" class="size-3.5"/>{{ formatCount(video.comments) }}
        </span>
        <span>{{ formatRelativeTime(video.createdAt) }}</span>
      </div>
    </div>

    <!--
      Spans both columns on phones so the actions sit under the row rather
      than squeezing a third column into 375px.
    -->
    <div class="col-span-2 flex items-center gap-2 sm:col-span-1">
      <Button :aria-label="`Edit ${video.title}`" as-child size="sm" variant="outline">
        <NuxtLink :to="editPath">
          <Pencil aria-hidden="true"/>
          Edit
        </NuxtLink>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button :aria-label="`More actions for ${video.title}`" size="sm" variant="ghost">
            <span aria-hidden="true" class="text-base leading-none">···</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuItem as-child>
            <NuxtLink :to="watchPath" class="flex cursor-pointer items-center gap-2.5">
              <ExternalLink aria-hidden="true"/>
              Watch page
            </NuxtLink>
          </DropdownMenuItem>

          <DropdownMenuItem class="cursor-pointer gap-2.5" @select="copyLink">
            <Copy aria-hidden="true"/>
            Copy link
          </DropdownMenuItem>

          <DropdownMenuSeparator/>

          <!-- Separated and tinted, because it's the only irreversible one here. -->
          <DropdownMenuItem
              class="cursor-pointer gap-2.5 text-destructive focus:text-destructive"
              @select="emit('delete', video)"
          >
            <Trash2 aria-hidden="true"/>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </li>
</template>
