<script lang="ts" setup>
import { MoreVertical, X } from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

/**
 * A card for one of the viewer's *own* rows — the shape every personal shelf on
 * the home page shares: a thumbnail with a corner chip, an optional progress
 * bar, title/channel/meta, and one destructive action behind a ⋮ menu.
 *
 * Extracted from `HomeContinueCard`, which was the only such card until the
 * recently-watched and Watch later rails arrived wanting the same thing with a
 * different chip, a different link and a different verb (CLAUDE.md rule 10:
 * reuse over duplication). The three differences are props, not variants:
 *
 * | shelf            | chip           | bar | menu                        |
 * |------------------|----------------|-----|-----------------------------|
 * | Continue         | "4 min left"   | yes | Remove from Continue watching |
 * | Recently watched | runtime        | yes | Remove from watch history   |
 * | Watch later      | runtime        | no  | Remove from Watch later     |
 *
 * Distinct from `HomeVideoCard`, which is a *recommendation*: that one saves
 * and gives feedback, this one only removes, and it never carries a "why you're
 * seeing this" line because the answer is always "you put it here".
 */
const props = withDefaults(
  defineProps<{
    /** Where the card goes. Already carries any `?t=` — see `resumeHref`. */
    to: string
    title: string
    channel: string
    image: string
    /** `null` for a channel with no `channels` row — the avatar falls back to an initial. */
    avatarUrl: string | null
    /** Secondary line, e.g. `"12.4k views"`. */
    meta: string
    /** Thumbnail corner chip: a runtime, or what's left of one. Omitted for none. */
    chip?: string
    /**
     * How full the progress bar is, 0–100. `null` draws no bar at all — a
     * saved-but-unwatched video has no progress, and a 0% bar would claim it
     * had been started.
     */
    percent?: number | null
    /** Read after the percentage by screen readers, which can't see the bar. */
    progressLabel?: string
    /** The one menu item's copy, e.g. `"Remove from Watch later"`. */
    menuLabel: string
  }>(),
  { chip: undefined, percent: null, progressLabel: '' }
)

defineEmits<{ (e: 'remove'): void }>()

const showProgress = computed(() => props.percent !== null && props.percent !== undefined)
</script>

<template>
  <article class="group relative">
    <NuxtLink
      :to="to"
      class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="relative aspect-video overflow-hidden rounded-xl bg-muted">
        <img
          :alt="title"
          :src="image"
          class="size-full object-cover transition duration-500 motion-safe:group-hover:scale-105"
          height="540"
          loading="lazy"
          width="960"
        />

        <span
          v-if="chip"
          class="absolute bottom-2 right-2 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground"
          >{{ chip }}</span
        >

        <!-- Sits flush on the bottom edge, the way every video player's
             progress bar does — a floating bar reads as a decoration. -->
        <template v-if="showProgress">
          <div class="absolute inset-x-0 bottom-0 h-1 bg-foreground/25">
            <div :style="{ width: `${percent}%` }" class="h-full bg-primary" />
          </div>
          <span class="sr-only">{{ percent }}% watched, {{ progressLabel }}</span>
        </template>
      </div>

      <div class="mt-3 flex gap-3">
        <ChannelAvatar :image="avatarUrl" :name="channel" aria-hidden="true" class="size-9" />
        <div class="min-w-0 flex-1 pr-8">
          <h3
            class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
          >
            {{ title }}
          </h3>
          <p class="mt-1 truncate text-xs text-muted-foreground">{{ channel }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ meta }}</p>
        </div>
      </div>
    </NuxtLink>

    <!-- Outside the anchor: a button nested in a link is invalid markup and
         swallows the navigation. Same arrangement as `HomeVideoCard`. -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          :aria-label="`More options for ${title}`"
          class="absolute right-1 top-1 size-8 rounded-full bg-background/80 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
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
          {{ menuLabel }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </article>
</template>
