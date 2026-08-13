<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { UP_NEXT_KINDS } from '@/utils/upNext'
import type { UpNextKind } from '@/utils/upNext'

/**
 * The search box and kind chips above the Up next rail.
 *
 * Purely a control surface — it holds no list and does no filtering. `WatchUpNext`
 * owns both pieces of state and derives the visible items from them, so this can
 * be dropped into the fixture page (`/zz-watch-preview`) or moved without
 * dragging a rail behind it.
 *
 * Toggle buttons with `aria-pressed`, not the `tablist` the home chip bar uses.
 * `HomeChipBar`'s chips *select which panel is shown* and each one names the
 * grid through `aria-controls`, which is a tab set; these narrow a list that is
 * already there, and announcing "tab, 2 of 3" for a filter would describe
 * navigation that doesn't happen.
 */
const props = defineProps<{
  /**
   * Render the Live/Clips chips. Off when the rail is all one kind, where the
   * chips can only ever empty the list — see `upNextHasBothKinds`.
   */
  showKinds: boolean
  /** How many items survive the current filter, and how many there were. */
  shown: number
  total: number
}>()

const query = defineModel<string>('query', { required: true })
const kind = defineModel<UpNextKind>('kind', { required: true })

/**
 * Announced rather than drawn. A sighted viewer watches the list shorten as
 * they type; a screen-reader user gets nothing unless the count is spoken, and
 * `polite` waits for a pause in typing instead of interrupting every keystroke.
 */
const status = computed(() =>
  props.shown === props.total
    ? `Showing all ${props.total} videos`
    : `Showing ${props.shown} of ${props.total} videos`
)
</script>

<template>
  <div class="mb-4 space-y-3">
    <div class="relative">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <!-- `type="search"` for the semantics and for Escape-to-clear, with the
           WebKit cancel button suppressed: it only appears in one browser, at a
           different size and inset than the button beside it. -->
      <Input
        v-model="query"
        type="search"
        aria-label="Search up next"
        placeholder="Search these videos"
        class="h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button
        v-if="query"
        type="button"
        aria-label="Clear search"
        class="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="query = ''"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div v-if="showKinds" class="flex gap-2" role="group" aria-label="Filter up next by type">
      <button
        v-for="option in UP_NEXT_KINDS"
        :key="option.id"
        type="button"
        :aria-pressed="kind === option.id"
        :class="
          cn(
            // Matches the home chip bar's pill, including the press feedback:
            // `hover:` never fires on a phone, so without `active:scale-95` a
            // tap looks like nothing happened until the list redraws.
            'touch-manipulation rounded-full px-3.5 py-1.5 text-xs font-medium transition-[background-color,color,transform] active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            kind === option.id
              ? 'bg-foreground text-background'
              : 'bg-muted text-foreground hover:bg-muted/70'
          )
        "
        @click="kind = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>
  </div>
</template>
