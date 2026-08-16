<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue'

/**
 * Older / newer, at the foot of an article.
 *
 * Both sides are optional and each renders independently, so the first and
 * last article in the newsroom get one link rather than a dead half-row. The
 * labels are "older" and "newer" rather than "previous" and "next" because the
 * ordering here is chronological, and "previous" in a date-sorted list is
 * ambiguous in a way that costs a click to resolve.
 */
defineProps<{
  older?: { path: string; title: string } | null
  newer?: { path: string; title: string } | null
}>()
</script>

<template>
  <nav
    v-if="older || newer"
    class="grid gap-4 border-t border-border pt-6 sm:grid-cols-2"
    aria-label="More articles"
  >
    <NuxtLink
      v-if="older"
      :to="older.path"
      class="group flex flex-col gap-1 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ArrowLeft class="size-3.5" aria-hidden="true" />
        Older
      </span>
      <span class="text-sm font-semibold text-foreground group-hover:text-primary">
        {{ older.title }}
      </span>
    </NuxtLink>

    <NuxtLink
      v-if="newer"
      :to="newer.path"
      class="group flex flex-col gap-1 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-start-2 sm:items-end sm:text-right"
    >
      <span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        Newer
        <ArrowRight class="size-3.5" aria-hidden="true" />
      </span>
      <span class="text-sm font-semibold text-foreground group-hover:text-primary">
        {{ newer.title }}
      </span>
    </NuxtLink>
  </nav>
</template>
