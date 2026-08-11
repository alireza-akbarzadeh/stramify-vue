<script lang="ts" setup>
import {onClickOutside} from '@vueuse/core'
import {useSearchBox} from '@/composables/useSearchBox'
import type {SearchSuggestion} from '@/utils/search'
import SearchField from './SearchField.vue'
import SearchSuggestions from './SearchSuggestions.vue'

/**
 * The app bar's search on screens wide enough for it — YouTube's shape: type
 * to get suggestions across videos (VODs *and* live) and channels, Enter for
 * the full results page.
 *
 * Below `sm` the bar renders `SearchSheet` instead; both are driven by
 * `useSearchBox`, so the only difference between them is presentation.
 *
 * The suggestion request is debounced and only fires from two characters up
 * (see `useSearch`), so a fast typist costs one query, not one per keystroke.
 */
const ID = 'app-search'

const root = ref<HTMLElement | null>(null)
const box = useSearchBox(ID)
const {expanded, suggestions, isFetching, term, cursor, close, go} = box

onClickOutside(root, close)
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <SearchField :box="box"/>

    <SearchSuggestions
        v-if="expanded"
        :active-index="cursor.index.value"
        :loading="isFetching"
        :option-id-prefix="ID"
        :query="term.trim()"
        :suggestions="suggestions"
        @highlight="(index: number) => (cursor.index.value = index)"
        @pick="(suggestion: SearchSuggestion) => go(suggestion.to)"
    />
  </div>
</template>
