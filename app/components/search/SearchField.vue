<script lang="ts" setup>
import {Search, X} from '@lucide/vue'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import type {SearchBox} from '@/composables/useSearchBox'

/**
 * The search control itself — icon, combobox input, clear button — with no
 * opinion about where its results are drawn. The inline dropdown and the
 * mobile sheet both render this, which is why the two agree on placeholder,
 * keyboard handling and ARIA wiring.
 *
 * `autofocus` is for the sheet: opening a search overlay that doesn't take the
 * caret (and, on a phone, the keyboard) is an extra tap for no reason.
 */
const props = defineProps<{ box: SearchBox; autofocus?: boolean }>()

const {id, term, expanded, activeId, cursor, show, close, clear, submit} = props.box
const field = ref<{ $el?: HTMLInputElement } | null>(null)

onMounted(() => props.autofocus && field.value?.$el?.focus())
</script>

<template>
  <form class="group relative flex min-w-0 items-center" role="search" @submit.prevent="submit">
    <Search
        aria-hidden="true"
        class="pointer-events-none absolute left-3 size-4 text-muted-foreground transition-colors group-focus-within:text-primary"
    />
    <Input
        ref="field"
        v-model="term"
        :aria-activedescendant="activeId"
        :aria-controls="`${id}-listbox`"
        :aria-expanded="expanded"
        aria-autocomplete="list"
        aria-label="Search videos and channels"
        autocomplete="off"
        class="h-10 rounded-full pl-10 pr-10"
        enterkeyhint="search"
        inputmode="search"
        placeholder="Search videos, channels…"
        role="combobox"
        @focus="show"
        @keydown.down.prevent="cursor.move(1)"
        @keydown.up.prevent="cursor.move(-1)"
        @keydown.esc="close"
    />
    <Button
        v-if="term"
        aria-label="Clear search"
        class="absolute right-1 size-8 rounded-full [&_svg]:size-4"
        size="icon"
        type="button"
        variant="ghost"
        @click="clear"
    >
      <X/>
    </Button>
  </form>
</template>
