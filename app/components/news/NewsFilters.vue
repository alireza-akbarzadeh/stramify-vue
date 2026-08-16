<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NEWS_CATEGORIES, type NewsCategory } from '#shared/types/news'
import { NEWS_CATEGORY_META } from '#shared/utils/news'

/**
 * Search box and desk chips.
 *
 * Presentational — it owns no state. Both values are `v-model`s so the page
 * holds the single filter object that `filterNews()` consumes, which is what
 * lets the result count, the empty state and the grid never disagree.
 *
 * The chips are a `tablist`: they are one-of-N over the same grid, which is
 * the tab pattern, and screen readers then announce "3 of 5" rather than five
 * unrelated buttons.
 */
defineProps<{ category: NewsCategory | null; query: string }>()

const emit = defineEmits<{
  (e: 'update:category', value: NewsCategory | null): void
  (e: 'update:query', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Filter news by desk">
      <Button
        type="button"
        role="tab"
        size="sm"
        variant="ghost"
        :aria-selected="category === null"
        :class="`rounded-full border px-3 text-xs font-semibold ${category === null ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`"
        @click="emit('update:category', null)"
      >
        All
      </Button>
      <Button
        v-for="item in NEWS_CATEGORIES"
        :key="item"
        type="button"
        role="tab"
        size="sm"
        variant="ghost"
        :aria-selected="category === item"
        :title="NEWS_CATEGORY_META[item].blurb"
        :class="`rounded-full border px-3 text-xs font-semibold ${category === item ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`"
        @click="emit('update:category', item)"
      >
        {{ NEWS_CATEGORY_META[item].label }}
      </Button>
    </div>

    <label class="group relative flex w-full items-center sm:max-w-xs">
      <Search
        class="absolute left-3 size-4 text-muted-foreground transition-colors group-focus-within:text-primary"
        aria-hidden="true"
      />
      <Input
        :model-value="query"
        placeholder="Search the newsroom…"
        aria-label="Search news articles"
        class="pl-10 pr-9"
        @update:model-value="emit('update:query', String($event))"
      />
      <Button
        v-if="query"
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Clear search"
        class="absolute right-1 size-8"
        @click="emit('update:query', '')"
      >
        <X />
      </Button>
    </label>
  </div>
</template>
