<script setup lang="ts">
/**
 * On this page — the article's `##` headings.
 *
 * Flat by design: the collection is configured to a TOC depth of 2, so this
 * only ever receives top-level sections. A nested outline of every `###` in a
 * 900-word post is a second article in the margin.
 *
 * Anchors, not scroll listeners. The browser already knows how to move to an
 * `id`, respects "reduce motion" while doing it, and puts the target in the
 * URL so the position survives a reload — none of which a JS scroller gets for
 * free. The landing offset lives in `news.css` as `scroll-margin-top`.
 */
defineProps<{ links: { id: string; text: string }[] }>()
</script>

<template>
  <nav v-if="links.length > 1" aria-labelledby="news-toc-heading">
    <h2
      id="news-toc-heading"
      class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
    >
      On this page
    </h2>
    <ul class="mt-3 space-y-2 border-l border-border">
      <li v-for="link in links" :key="link.id">
        <a
          :href="`#${link.id}`"
          class="-ml-px block border-l border-transparent pl-3 text-sm leading-snug text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {{ link.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
