<script lang="ts" setup>
import { Search } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { VISIBILITY_COPY } from '#shared/utils/studio'
import type { ClipVisibility } from '#shared/types/studio'
import type { StudioSort, VisibilityFilter } from '@/composables/useStudioFilters'

/**
 * Search, a visibility filter and a sort, above the content list.
 *
 * The visibility filter is a row of toggle chips rather than a select: there
 * are four options, they're the primary way a creator finds "what haven't I
 * published yet", and a select would hide three of them plus the current
 * state behind a click.
 */
defineProps<{ search: string; visibility: VisibilityFilter; sort: StudioSort; total: number }>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:visibility': [value: VisibilityFilter]
  'update:sort': [value: StudioSort]
}>()

const filters: { value: VisibilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...(['public', 'unlisted', 'private'] as ClipVisibility[]).map((value) => ({
    value,
    label: VISIBILITY_COPY[value].label
  }))
]

const sorts: { value: StudioSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'views', label: 'Most viewed' },
  { value: 'title', label: 'Title A–Z' }
]
</script>

<template>
  <div class="mb-5 grid gap-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative min-w-0 flex-1">
        <Search
            aria-hidden="true"
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
            :model-value="search"
            aria-label="Search your videos"
            class="pl-9"
            placeholder="Search your videos"
            type="search"
            @update:model-value="emit('update:search', String($event))"
        />
      </div>

      <label class="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <span class="sr-only sm:not-sr-only">Sort</span>
        <select
            :value="sort"
            class="h-11 rounded-lg border border-input bg-white/3 px-3 text-sm text-foreground outline-none transition-colors duration-200 focus-visible:border-ring"
            @change="emit('update:sort', ($event.target as HTMLSelectElement).value as StudioSort)"
        >
          <option v-for="option in sorts" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <!-- `group`/`aria-pressed` rather than radios: these are filters on a list,
         not a value being submitted, and "pressed" is what they are. -->
    <div aria-label="Filter by visibility" class="flex flex-wrap gap-2" role="group">
      <button
          v-for="filter in filters"
          :key="filter.value"
          :aria-pressed="visibility === filter.value"
          :class="[
          'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          visibility === filter.value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-surface-2/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
        ]"
          type="button"
          @click="emit('update:visibility', filter.value)"
      >
        {{ filter.label }}
      </button>

      <span class="ml-auto self-center text-xs tabular-nums text-muted-foreground">
        {{ total }} {{ total === 1 ? 'video' : 'videos' }}
      </span>
    </div>
  </div>
</template>
