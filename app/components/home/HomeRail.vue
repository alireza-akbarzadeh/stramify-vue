<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { motion } from 'motion-v'
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

/**
 * Spring rather than a duration on the arrows: a press should read as
 * something with weight being pushed, and springs are interruptible — clicking
 * through a rail quickly never queues up a line of settling animations behind
 * the scrolling. The chevron's nudge is CSS on the button's own hover, because
 * it's a hint about direction, not a reaction to a press.
 */
const PRESS = { type: 'spring' as const, stiffness: 420, damping: 26 }
const NUDGE = 'transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'
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
        <!-- `-my-2 py-2` grows the tap target to ~36px without moving anything:
             the padding pads the box, the negative margin gives the space back
             to the layout. A 20px line of text is a miss-prone target on a
             phone, and this is the only way off the shelf. -->
        <NuxtLink
          v-if="to"
          :to="to"
          class="-my-2 shrink-0 rounded py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {{ toLabel ?? 'See all' }}
        </NuxtLink>
      </div>

      <div class="hidden shrink-0 gap-2 sm:flex">
        <motion.div :while-hover="{ scale: 1.08 }" :while-press="{ scale: 0.9 }" :transition="PRESS">
          <Button
            type="button"
            variant="outline"
            size="icon"
            :aria-label="`Scroll ${title} left`"
            class="group/arrow size-9 rounded-full"
            @click="scroll(-1)"
          >
            <ChevronLeft :class="[NUDGE, 'group-hover/arrow:-translate-x-0.5']" />
          </Button>
        </motion.div>
        <motion.div :while-hover="{ scale: 1.08 }" :while-press="{ scale: 0.9 }" :transition="PRESS">
          <Button
            type="button"
            variant="outline"
            size="icon"
            :aria-label="`Scroll ${title} right`"
            class="group/arrow size-9 rounded-full"
            @click="scroll(1)"
          >
            <ChevronRight :class="[NUDGE, 'group-hover/arrow:translate-x-0.5']" />
          </Button>
        </motion.div>
      </div>
    </div>

    <!--
      On a phone the track runs to the screen edges and carries the page's own
      1rem gutter as padding instead, so a card scrolls under the edge rather
      than stopping short of it — the shape a native carousel has. `scroll-px-4`
      makes `snap-start` land the card *on* the gutter rather than flush against
      the edge, and `overscroll-x-contain` keeps a flick past the last card from
      chaining into the browser's back-swipe or bouncing the whole page
      sideways. Both surfaces that render this rail (`HomeView`, `FollowingView`)
      use the same `px-4` container below `sm`, so the 1rem is theirs.
    -->
    <ul
      ref="track"
      class="-mx-4 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 scroll-px-4 scrollbar-none sm:mx-0 sm:px-0 sm:scroll-px-0"
    >
      <slot />
    </ul>
  </section>
</template>
