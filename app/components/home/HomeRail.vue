<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/**
 * The chrome every home shelf shares: a heading, an optional link on the right,
 * and a horizontally scrolling track with arrow buttons.
 *
 * Extracted from `HomeFollowingRail`, which was the only rail until this page
 * grew four more. The cards differ per shelf — a video, a mix, a playlist, a
 * short are different shapes — so the track's *contents* are a slot and only
 * the frame lives here (CLAUDE.md rule 10: reuse over duplication).
 *
 * The track is a real `ul` with `overflow-x-auto`, not a transform carousel:
 * that keeps keyboard and touch scrolling native, and the arrows are a
 * convenience on top of it rather than the only way through. They're hidden
 * below `sm`, where swiping is the obvious gesture and two more tap targets
 * would just crowd the row.
 */
const props = withDefaults(
  defineProps<{
    title: string
    /** DOM id for the heading — the section points at it with `aria-labelledby`. */
    headingId: string
    /** Optional "see all" destination, rendered as a link beside the heading. */
    to?: string
    /** Label for that link. Ignored without `to`. */
    toLabel?: string
    /**
     * Pixels one arrow press travels. The default is a bit under two video
     * cards; a rail of much smaller items (the story circles on `/following`)
     * passes its own, or a press would fly past a whole screenful of them.
     */
    step?: number
  }>(),
  { to: undefined, toLabel: undefined, step: 640 }
)

const track = useTemplateRef<HTMLUListElement>('track')

function scroll(direction: -1 | 1) {
  track.value?.scrollBy({ left: direction * props.step, behavior: 'smooth' })
}
</script>

<template>
  <!--
    `min-w-0` is load-bearing, not decoration. The dashboard layout's `main` is
    a flex item, and a flex item's default `min-width: auto` means its width is
    floored by its content's min-content size. The slides below are `shrink-0`
    with a percentage width, which can't resolve during min-content sizing, so
    they fall back to their intrinsic image width — and the whole page grew a
    horizontal scrollbar the width of the sidebar. Capping this section at zero
    stops the track from voting on how wide the page is.
  -->
  <section :aria-labelledby="headingId" class="min-w-0">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-baseline gap-3">
        <!--
          The heading is a slot so a shelf can put an avatar and a badge beside
          its title (`/following` names a channel, not a category). It still
          carries `headingId` and falls back to plain text, so nothing that
          doesn't opt in changes.
        -->
        <slot name="heading" :heading-id="headingId">
          <h2 :id="headingId" class="truncate text-lg font-semibold text-foreground">
            {{ title }}
          </h2>
        </slot>
        <NuxtLink
          v-if="to"
          :to="to"
          class="shrink-0 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {{ toLabel ?? 'See all' }}
        </NuxtLink>
      </div>

      <div class="hidden shrink-0 gap-2 sm:flex">
        <Button
          type="button"
          variant="outline"
          size="icon"
          :aria-label="`Scroll ${title} left`"
          class="size-9 rounded-full"
          @click="scroll(-1)"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          :aria-label="`Scroll ${title} right`"
          class="size-9 rounded-full"
          @click="scroll(1)"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>

    <ul
      ref="track"
      class="flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none"
    >
      <slot />
    </ul>
  </section>
</template>
