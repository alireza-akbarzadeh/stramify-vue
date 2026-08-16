<script setup lang="ts">
import type { NewsCategory } from '#shared/types/news'
import { NEWS_CATEGORY_META } from '#shared/utils/news'

/**
 * The desk a post belongs to. Colour comes from the category's own token, so
 * a new category is one entry in `NEWS_CATEGORY_META` and nothing here.
 *
 * `color-mix` against the token rather than four hard-coded tints: the border
 * and fill then track whatever the palette does in either theme, including a
 * future re-tune of `--primary`.
 */
const props = defineProps<{ category: NewsCategory }>()

const meta = computed(() => NEWS_CATEGORY_META[props.category])
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
    :style="{
      color: meta.tint,
      borderColor: `color-mix(in oklab, ${meta.tint} 35%, transparent)`,
      backgroundColor: `color-mix(in oklab, ${meta.tint} 12%, transparent)`
    }"
  >
    {{ meta.label }}
  </span>
</template>
