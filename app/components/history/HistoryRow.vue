<script setup lang="ts">
import { CircleCheck, MoreVertical, Play, X } from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { historyHref, historyTimeLabel } from '#shared/utils/history'
import type { HistoryItem } from '#shared/types/history'

/**
 * One watched video, as a horizontal row.
 *
 * A row rather than the grid card the rails use: history is a chronological
 * list you scan down, and a row fits the title, the channel and the progress on
 * one line each at a density a 16:9 card can't reach.
 *
 * The progress bar is the point of the page and is drawn for *every* row, not
 * just resumable ones — including finished videos, where a full bar is the
 * answer to "did I already watch this". It sits flush on the thumbnail's bottom
 * edge the way a player's own scrubber does; a floating bar reads as decoration.
 */
const props = defineProps<{ item: HistoryItem }>()
defineEmits<{ (e: 'remove'): void }>()

const to = computed(() => historyHref(props.item))
const watchedAt = computed(() => historyTimeLabel(props.item.watchedAt))
</script>

<template>
  <article class="group relative">
    <NuxtLink
      :to="to"
      class="flex gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
    >
      <!-- `self-start` is load-bearing: a flex child stretches to the row's
           height by default, and on a narrow screen the wrapped title makes the
           row taller than 16:9 — which would silently stretch the thumbnail out
           of ratio. -->
      <div
        class="relative aspect-video w-32 shrink-0 self-start overflow-hidden rounded-lg bg-muted sm:w-52 lg:w-60"
      >
        <img
          :src="item.image"
          :alt="item.title"
          width="480"
          height="270"
          loading="lazy"
          class="size-full object-cover transition duration-500 motion-safe:group-hover:scale-105"
        />

        <!-- The runtime, as every other card on the site shows it. How far in
             you are is said once, below — putting it here too made every row
             state the same thing twice. -->
        <span
          v-if="item.duration"
          class="absolute bottom-1.5 right-1.5 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground"
          >{{ item.duration }}</span
        >

        <!-- Sits flush on the bottom edge, the way a player's own scrubber
             does; a floating bar reads as decoration. A finished video keeps a
             full bar rather than losing it — that full bar is the answer to
             "have I already seen this one". -->
        <div class="absolute inset-x-0 bottom-0 h-1 bg-foreground/25">
          <div :style="{ width: `${item.percent}%` }" class="h-full bg-primary" />
        </div>
        <span class="sr-only">{{ item.percent }}% watched, {{ item.progressLabel }}</span>
      </div>

      <div class="min-w-0 flex-1 pr-9 sm:pr-10">
        <h3
          class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-base"
        >
          {{ item.title }}
        </h3>

        <div class="mt-1.5 flex min-w-0 items-center gap-2">
          <ChannelAvatar
            :image="item.avatarUrl"
            :name="item.channel"
            aria-hidden="true"
            class="size-6 sm:size-7"
          />
          <p class="truncate text-xs text-muted-foreground sm:text-sm">{{ item.channel }}</p>
        </div>

        <p class="mt-1 truncate text-xs text-muted-foreground">
          {{ item.meta }}
          <!-- Hidden on the narrowest screens: at 375px the title column is
               already tight, and the day heading gives enough of a "when". -->
          <span class="hidden sm:inline"> · Watched at {{ watchedAt }}</span>
        </p>

        <!-- The one line that says what this page is for. Icon *and* wording
             carry it, so it doesn't rest on the red/grey difference alone. -->
        <p
          :class="item.completed ? 'text-muted-foreground' : 'text-primary'"
          class="mt-1.5 flex items-center gap-1.5 text-xs font-medium"
        >
          <component
            :is="item.completed ? CircleCheck : Play"
            aria-hidden="true"
            class="size-3.5 shrink-0"
          />
          {{ item.completed ? 'Watched' : `Resume · ${item.progressLabel}` }}
        </p>
      </div>
    </NuxtLink>

    <!-- Outside the anchor: a button nested in a link is invalid markup and
         swallows the navigation. Visible by default at touch sizes, where
         there's no hover to reveal it, and 44px square there per the touch
         target minimum. Same arrangement as `HomeContinueCard`. -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          :aria-label="`More options for ${item.title}`"
          class="absolute right-1 top-3 size-11 rounded-full sm:size-9 sm:opacity-0 sm:transition-opacity sm:focus-visible:opacity-100 sm:group-hover:opacity-100 sm:data-[state=open]:opacity-100"
          size="icon"
          type="button"
          variant="ghost"
          @pointerdown.stop
          @click.stop
        >
          <MoreVertical class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" @pointerdown.stop @click.stop>
        <DropdownMenuItem @select="$emit('remove')">
          <X class="size-4" />
          Remove from watch history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </article>
</template>
