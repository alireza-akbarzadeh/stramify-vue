<script lang="ts" setup>
import {ArrowLeft, Search} from '@lucide/vue'
import type {HTMLAttributes} from 'vue'
import {cn} from '@/lib/utils'
import {Button} from '@/components/ui/button'
import {Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from '@/components/ui/sheet'
import {useSearchBox} from '@/composables/useSearchBox'
import type {SearchSuggestion} from '@/utils/search'
import SearchField from './SearchField.vue'
import SearchSuggestionList from './SearchSuggestionList.vue'

/**
 * Search on phones: a tap target in the bar that opens a full-screen sheet,
 * the shape every native app uses. A permanently visible input can't work at
 * this width — it either squeezes the bar's actions off screen or shrinks to
 * a field too small to read what you typed.
 *
 * Full-height rather than a dropdown because the on-screen keyboard eats the
 * bottom half of the viewport; results need the whole remaining column.
 */
/** `class` lands on the trigger button — `Sheet` itself renders no element,
 *  so a fallthrough class would have nowhere to go. */
const props = defineProps<{ class?: HTMLAttributes['class'] }>()

const box = useSearchBox('app-search-mobile')
const {open, expanded, suggestions, isFetching, term, cursor, show, close, go} = box
</script>

<template>
  <Sheet :open="open" @update:open="(value: boolean) => (value ? show() : close())">
    <SheetTrigger as-child>
      <Button
          :class="cn('size-9 rounded-full [&_svg]:size-5', props.class)"
          aria-label="Search"
          size="icon"
          variant="ghost"
      >
        <Search/>
      </Button>
    </SheetTrigger>

    <!--
      `[&>button]:hidden` drops `SheetContent`'s built-in corner close button —
      the header below already owns dismissal, and the stock one would land on
      top of the field's clear button.
    -->
    <SheetContent
        class="h-dvh gap-0 p-0 [&>button]:hidden motion-reduce:animate-none"
        side="top"
        @open-auto-focus.prevent
    >
      <SheetTitle class="sr-only">Search</SheetTitle>

      <SheetHeader class="flex-row items-center gap-1 border-b border-border p-2">
        <SheetClose as-child>
          <Button aria-label="Close search" class="size-10 shrink-0 rounded-full" size="icon" variant="ghost">
            <ArrowLeft/>
          </Button>
        </SheetClose>
        <SearchField :box="box" autofocus class="flex-1"/>
      </SheetHeader>

      <SearchSuggestionList
          v-if="expanded"
          :active-index="cursor.index.value"
          :loading="isFetching"
          :query="term.trim()"
          :suggestions="suggestions"
          class="flex-1"
          option-id-prefix="app-search-mobile"
          @highlight="(index: number) => (cursor.index.value = index)"
          @pick="(suggestion: SearchSuggestion) => go(suggestion.to)"
      />

      <p v-else class="p-6 text-center text-sm text-muted-foreground">
        Search videos, channels and live streams.
      </p>
    </SheetContent>
  </Sheet>
</template>
