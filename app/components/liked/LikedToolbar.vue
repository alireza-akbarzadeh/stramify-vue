<script setup lang="ts">
import { ArrowDownWideNarrow, Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { LIKED_SORTS } from '#shared/types/library'
import { LIKED_SORT_LABELS } from '#shared/utils/liked'
import type { LikedSort } from '#shared/types/library'

/**
 * Search within liked videos, and choose how they're ordered.
 *
 * Presentational: both controls are `defineModel`s, so `LikedView` keeps the
 * query and this file stays about the bar. The search field is the same one
 * `HistoryToolbar` draws — a labelled input with an icon and a clear button —
 * because two search boxes in the same library that look different for no
 * reason is a worse page than two that match.
 *
 * A dropdown of radio items rather than a segmented row of buttons: three
 * options is already too wide for a 375px screen next to a search field, and
 * the menu says which one is active in a single line instead of asking the
 * viewer to spot the highlighted third of a control.
 */
const term = defineModel<string>('term', { required: true })
const sort = defineModel<LikedSort>('sort', { required: true })

/**
 * Reka's radio group speaks plain strings, so the cast is where the two type
 * systems meet. It's safe by construction: the only items in the group are
 * built from `LIKED_SORTS`, which is what `LikedSort` is derived from.
 */
function selectSort(value: string) {
  sort.value = value as LikedSort
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <!-- A label, not a placeholder-only field: the placeholder disappears the
         moment you type, and "what was this box for" is exactly the question a
         half-typed search raises. Visually hidden because the icon and the
         page context carry it for sighted users. -->
    <div class="relative w-full sm:max-w-sm">
      <label class="sr-only" for="liked-search">Search liked videos</label>
      <Search
        aria-hidden="true"
        class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="liked-search"
        v-model="term"
        autocomplete="off"
        class="pl-9 pr-9"
        placeholder="Search liked videos"
        type="search"
      />
      <Button
        v-if="term"
        aria-label="Clear search"
        class="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full"
        size="icon"
        type="button"
        variant="ghost"
        @click="term = ''"
      >
        <X class="size-4" />
      </Button>
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <!-- The current order is in the button, not just inside the menu:
             a control whose label never changes can't tell you what it's set
             to without being opened. -->
        <Button class="shrink-0 self-start sm:self-auto" size="sm" type="button" variant="outline">
          <ArrowDownWideNarrow class="size-4" />
          {{ LIKED_SORT_LABELS[sort] }}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup :model-value="sort" @update:model-value="selectSort">
          <DropdownMenuRadioItem v-for="option in LIKED_SORTS" :key="option" :value="option">
            {{ LIKED_SORT_LABELS[option] }}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
