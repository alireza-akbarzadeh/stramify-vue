<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { useElementSize, useScroll } from '@vueuse/core'
import { Button } from '@/components/ui/button'
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

/** Only worth showing arrows when the rail actually overflows. */
const overflows = computed(() => (rail.value?.scrollWidth ?? 0) > width.value + 1)

function scroll(direction: -1 | 1) {
  rail.value?.scrollBy({ left: direction * Math.max(200, width.value * 0.6), behavior: 'smooth' })
}

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
      class="flex gap-3 overflow-hidden py-1"
      role="status"
      aria-label="Loading filters"
    >
      <div v-for="n in 5" :key="n" class="h-8 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
    </div>

    <template v-else>
      <div
        ref="rail"
        role="tablist"
        aria-label="Filter the feed by category"
        class="flex gap-3 overflow-x-auto py-1 scrollbar-none"
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
              'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
          class="pointer-events-none absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-background via-background to-transparent pr-8"
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
          class="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-background via-background to-transparent pl-8"
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
