<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { useElementSize, useScroll } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { chipDomId } from '#shared/utils/home'
import type { HomeChip } from '#shared/types/home'

/**
 * The filter row above the feed — YouTube's shape: one horizontal line of
 * chips that scrolls sideways rather than wrapping onto a second row.
 *
 * It's a `tablist`, not a set of buttons: the chips select which feed is shown
 * below, so left/right arrow keys move between them and only the active chip
 * is in the tab order. Each chip points at the grid via `aria-controls`, and
 * the grid names the active chip back with `aria-labelledby` — see
 * `chipDomId`, which both sides use to agree on the id. The scroll arrows are
 * `aria-hidden`: they duplicate what scrolling and the keyboard already do, so
 * announcing them would add two stops that lead nowhere.
 *
 * Below `sm` the arrows don't render at all — same rule `HomeRail` follows.
 * They're a pointer affordance, and on a 360px bar the two buttons plus their
 * fade gradients sat *on top of* the first and last chips, eating the taps that
 * were aimed at them.
 */
const props = defineProps<{
  chips: HomeChip[]
  activeId: string
  loading?: boolean
  /** Id of the element these chips filter, for `aria-controls`. */
  panelId: string
}>()
const emit = defineEmits<{ (e: 'select', chip: HomeChip): void }>()

const rail = useTemplateRef<HTMLDivElement>('rail')
const { arrivedState } = useScroll(rail)
const { width } = useElementSize(rail)

/**
 * Only worth showing arrows when the rail actually overflows.
 *
 * Measured rather than computed: `scrollWidth` isn't reactive, so this has to
 * be re-read whenever the content or the box could have changed — which
 * includes the moment the category chips arrive and replace the skeleton, not
 * just on resize. `nextTick` waits for that render before measuring.
 */
const overflows = ref(false)

watch(
  [() => props.chips.length, () => props.loading, width],
  async () => {
    await nextTick()
    const el = rail.value
    overflows.value = !!el && el.scrollWidth > el.clientWidth + 1
  },
  { immediate: true }
)

function scroll(direction: -1 | 1) {
  rail.value?.scrollBy({ left: direction * Math.max(200, width.value * 0.6), behavior: 'smooth' })
}

/**
 * Placeholder chip widths, in the proportions the real labels come out at
 * ("All", "Live", then category names). A row of identical pills reads as a
 * loading bar; these read as chips.
 */
const SKELETON_WIDTHS = ['w-14', 'w-16', 'w-20', 'w-24', 'w-[5.5rem]']

/**
 * The track runs to the screen edges on a phone and pulls its own gutter back
 * in as padding, so a chip scrolls *under* the edge instead of stopping an inch
 * short of it — the difference between a row that reads as continuing offscreen
 * and one that reads as a boxed widget. `scroll-px` keeps a snapped/focused chip
 * off the very edge, and `overscroll-x-contain` stops a flick past the last chip
 * from chaining into the browser's back gesture.
 *
 * The 1rem matches the page container's `px-4`; it's only claimed below `sm`,
 * where that gutter is the same on every surface this bar renders on.
 */
const TRACK = '-mx-4 px-4 scroll-px-4 overscroll-x-contain sm:mx-0 sm:px-0 sm:scroll-px-0'

/** Roving focus: arrow keys move the selection, which is also what moves focus. */
function onArrowKey(direction: -1 | 1) {
  const index = props.chips.findIndex((chip) => chip.id === props.activeId)
  const next = props.chips[index + direction]
  if (next) emit('select', next)
}
</script>

<template>
  <div class="relative">
    <div
      v-if="loading"
      :class="cn('flex gap-3 overflow-hidden py-1', TRACK)"
      role="status"
      aria-label="Loading filters"
    >
      <!-- Exactly a real chip: py-2/py-1.5 twice over a text-sm line box. -->
      <Skeleton
        v-for="chipWidth in SKELETON_WIDTHS"
        :key="chipWidth"
        :class="['h-9 shrink-0 rounded-full sm:h-8', chipWidth]"
      />
    </div>

    <template v-else>
      <div
        ref="rail"
        role="tablist"
        aria-label="Filter the feed by category"
        :class="cn('flex gap-3 overflow-x-auto py-1 scrollbar-none', TRACK)"
        @keydown.left.prevent="onArrowKey(-1)"
        @keydown.right.prevent="onArrowKey(1)"
      >
        <button
          v-for="chip in chips"
          :id="chipDomId(chip.id)"
          :key="chip.id"
          type="button"
          role="tab"
          :aria-controls="panelId"
          :aria-selected="chip.id === activeId"
          :tabindex="chip.id === activeId ? 0 : -1"
          :class="
            cn(
              // py-2 is a 36px chip on touch (32px from `sm` up), and
              // `active:scale-95` is the press feedback a native chip gives —
              // `hover:` never fires on a phone, so without it a tap looks like
              // nothing happened until the feed swaps underneath.
              'shrink-0 touch-manipulation whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,transform] active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:py-1.5',
              chip.id === activeId
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground hover:bg-muted/70'
            )
          "
          @click="emit('select', chip)"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Fades hint that there's more off-screen; arrows are the pointer affordance. -->
      <template v-if="overflows">
        <div
          v-show="!arrivedState.left"
          class="pointer-events-none absolute inset-y-0 left-0 hidden items-center bg-gradient-to-r from-background via-background to-transparent pr-8 sm:flex"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-hidden="true"
            tabindex="-1"
            class="pointer-events-auto size-8 rounded-full"
            @click="scroll(-1)"
          >
            <ChevronLeft />
          </Button>
        </div>
        <div
          v-show="!arrivedState.right"
          class="pointer-events-none absolute inset-y-0 right-0 hidden items-center bg-gradient-to-l from-background via-background to-transparent pl-8 sm:flex"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-hidden="true"
            tabindex="-1"
            class="pointer-events-auto size-8 rounded-full"
            @click="scroll(1)"
          >
            <ChevronRight />
          </Button>
        </div>
      </template>
    </template>
  </div>
</template>
