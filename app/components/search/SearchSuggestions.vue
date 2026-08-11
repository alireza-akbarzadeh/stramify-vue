<script lang="ts" setup>
import type {SearchSuggestion} from '@/utils/search'
import SearchSuggestionList from './SearchSuggestionList.vue'

/**
 * The desktop dropdown: `SearchSuggestionList` on a floating popover anchored
 * under the input. Mobile doesn't use this — a panel that narrow, over a
 * keyboard that tall, is why `SearchSheet` exists instead.
 */
defineProps<{
  suggestions: SearchSuggestion[]
  activeIndex: number
  query: string
  loading: boolean
  optionIdPrefix: string
}>()

const emit = defineEmits<{
  (e: 'pick', suggestion: SearchSuggestion): void
  (e: 'highlight', index: number): void
}>()
</script>

<template>
  <SearchSuggestionList
      class="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(70vh,26rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-[0_24px_60px_-24px_var(--shadow-color)] backdrop-blur-xl"
      v-bind="{ suggestions, activeIndex, query, loading, optionIdPrefix }"
      @highlight="(index: number) => emit('highlight', index)"
      @pick="(suggestion: SearchSuggestion) => emit('pick', suggestion)"
  />
</template>
