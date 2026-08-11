<script lang="ts" setup>
import {Radio, Search, Tv, Video} from '@lucide/vue'
import type {HTMLAttributes} from 'vue'
import {cn} from '@/lib/utils'
import type {SearchSuggestion} from '@/utils/search'
import {toSearchPath} from '@/utils/search'

/**
 * The suggestion rows themselves — a listbox plus the "see all results"
 * escape hatch. Deliberately unstyled as a surface: the desktop dropdown
 * (`SearchSuggestions`) puts it on a floating popover, the mobile sheet drops
 * it straight onto the sheet's own background, and neither has to restyle the
 * rows to do it.
 */
const props = defineProps<{
  suggestions: SearchSuggestion[]
  /** Highlighted row, or `-1` for none. Owned by the parent's keyboard cursor. */
  activeIndex: number
  query: string
  loading: boolean
  /** Prefix for each option's DOM id, so the input can point `aria-activedescendant` at it. */
  optionIdPrefix: string
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  (e: 'pick', suggestion: SearchSuggestion): void
  (e: 'highlight', index: number): void
}>()

const ICONS = {live: Radio, clip: Video, channel: Tv}
</script>

<template>
  <div :class="cn('flex min-h-0 flex-col', props.class)">
    <ul
        :id="`${optionIdPrefix}-listbox`"
        aria-label="Search suggestions"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
        role="listbox"
    >
      <li v-if="!suggestions.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
        {{ loading ? 'Searching…' : `No matches for “${query}”` }}
      </li>

      <li
          v-for="(suggestion, index) in suggestions"
          :id="`${optionIdPrefix}-option-${index}`"
          :key="suggestion.id"
          :aria-selected="index === activeIndex"
          :class="[
          'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors sm:py-2',
          index === activeIndex && 'bg-surface-2'
        ]"
          role="option"
          @click="emit('pick', suggestion)"
          @mousemove="emit('highlight', index)"
      >
        <span
            :class="suggestion.kind === 'channel' && 'rounded-full'"
            class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground"
        >
          <img
              v-if="suggestion.image"
              :src="suggestion.image"
              alt=""
              class="size-full object-cover"
              height="80"
              loading="lazy"
              width="80"
          />
          <component :is="ICONS[suggestion.kind]" v-else aria-hidden="true" class="size-4"/>
        </span>

        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm text-foreground">{{ suggestion.label }}</span>
          <span class="block truncate text-xs text-muted-foreground">{{ suggestion.hint }}</span>
        </span>

        <component
            :is="ICONS[suggestion.kind]"
            :class="suggestion.kind === 'live' && 'text-primary'"
            aria-hidden="true"
            class="size-3.5 shrink-0 text-muted-foreground"
        />
      </li>
    </ul>

    <!--
      Deliberately not a listbox option: Enter with nothing highlighted already
      goes here, so keyboard users reach it without arrowing past every row.
    -->
    <NuxtLink
        :to="toSearchPath(query)"
        class="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:py-2.5"
    >
      <Search aria-hidden="true" class="size-4 text-muted-foreground"/>
      See all results for “{{ query }}”
    </NuxtLink>
  </div>
</template>
