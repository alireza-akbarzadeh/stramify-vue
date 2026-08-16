<script setup lang="ts">
import { Clapperboard, Route, Sparkles, Wrench } from '@lucide/vue'
import type { Component } from 'vue'
import type { NewsCategory, NewsCoverImage } from '#shared/types/news'
import { NEWS_CATEGORY_META } from '#shared/utils/news'

/**
 * An article's cover.
 *
 * Cover art is optional in the frontmatter, and the fallback is the point of
 * this component: an article without an image gets a panel drawn from its own
 * category colour instead of a broken `<img>` or — worse — a stock photo that
 * has nothing to do with the piece. Add a real `cover:` to a post later and it
 * takes over with no change here or at any call site.
 *
 * `eager` exists for the hero, which is above the fold on every viewport.
 * Lazy-loading the largest image on the page is how a page gets a slow
 * Largest Contentful Paint for free.
 */
const props = defineProps<{
  category: NewsCategory
  cover?: NewsCoverImage
  eager?: boolean
}>()

const ICONS: Record<NewsCategory, Component> = {
  product: Sparkles,
  creators: Clapperboard,
  engineering: Wrench,
  roadmap: Route
}

const tint = computed(() => NEWS_CATEGORY_META[props.category].tint)
</script>

<template>
  <div class="relative size-full overflow-hidden bg-surface-2">
    <img
      v-if="cover"
      :src="cover.src"
      :alt="cover.alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : undefined"
      class="size-full object-cover"
    />

    <!--
      Decorative, so it takes no alt text and no role — the heading beside it
      already says what the article is. Two layers: a wash of the category
      colour, and a hairline grid that keeps a large panel from reading as a
      failed image load.
    -->
    <div
      v-else
      class="flex size-full items-center justify-center"
      :style="{
        background: `radial-gradient(120% 120% at 15% 0%, color-mix(in oklab, ${tint} 32%, transparent) 0%, transparent 60%), linear-gradient(140deg, var(--surface-2), var(--surface-3))`
      }"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 opacity-[0.35]"
        style="
          background-image:
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px);
          background-size: 44px 44px;
        "
      />
      <component
        :is="ICONS[category]"
        class="relative size-10 opacity-80"
        :style="{ color: tint }"
      />
    </div>
  </div>
</template>
