<script lang="ts" setup>
import {MoreVertical, X} from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import {Button} from '@/components/ui/button'
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {resumeHref} from '#shared/utils/library'
import type {ContinueWatchingItem} from '#shared/types/library'

/**
 * A part-watched clip, with the bar showing how far in you got.
 *
 * Its own card rather than a variant of `HomeVideoCard` because three things
 * differ and all three are structural: the link carries a `?t=`, the thumbnail
 * carries a progress bar, and the corner action removes the row instead of
 * saving the video. A `variant` prop on the shared card would have had to
 * branch on all three.
 *
 * The duration chip is replaced by "4 min left" — on a video you're partway
 * through, time remaining is the number you actually want.
 */
const props = defineProps<{ item: ContinueWatchingItem }>()
defineEmits<{ (e: 'remove'): void }>()

const to = computed(() => resumeHref(props.item.slug, props.item.positionSeconds))
</script>

<template>
  <article class="group relative">
    <NuxtLink
        :to="to"
        class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="relative aspect-video overflow-hidden rounded-xl bg-muted">
        <img
            :alt="item.title"
            :src="item.image"
            class="size-full object-cover transition duration-500 group-hover:scale-105"
            height="540"
            loading="lazy"
            width="960"
        />

        <span
            class="absolute bottom-2 right-2 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
        >{{ item.remaining }}</span
        >

        <!-- Sits flush on the bottom edge, the way every video player's
             progress bar does — a floating bar reads as a decoration. -->
        <div class="absolute inset-x-0 bottom-0 h-1 bg-foreground/25">
          <div :style="{ width: `${item.percent}%` }" class="h-full bg-primary"/>
        </div>
        <span class="sr-only">{{ item.percent }}% watched, {{ item.remaining }}</span>
      </div>

      <div class="mt-3 flex gap-3">
        <ChannelAvatar
            :image="item.avatarUrl"
            :name="item.channel"
            aria-hidden="true"
            class="size-9"
        />
        <div class="min-w-0 flex-1 pr-8">
          <h3
              class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
          >
            {{ item.title }}
          </h3>
          <p class="mt-1 truncate text-xs text-muted-foreground">{{ item.channel }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ item.meta }}</p>
        </div>
      </div>
    </NuxtLink>

    <!-- Outside the anchor: a button nested in a link is invalid markup and
         swallows the navigation. Same arrangement as `HomeVideoCard`. -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
            :aria-label="`More options for ${item.title}`"
            class="absolute right-1 top-1 size-8 rounded-full bg-background/80 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            size="icon"
            type="button"
            variant="ghost"
            @pointerdown.stop
            @click.stop
        >
          <MoreVertical class="size-4"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
          align="end"
          @pointerdown.stop
          @click.stop>
        <DropdownMenuItem @select="$emit('remove')">
          <X class="size-4"/>
          Remove from Continue watching
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </article>
</template>
