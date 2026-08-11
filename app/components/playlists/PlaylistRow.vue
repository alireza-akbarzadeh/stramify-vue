<script setup lang="ts">
import type { PlaylistItem } from '#shared/types/library'

/**
 * One numbered row in an open playlist.
 *
 * The index comes from the rendered order, not from `item.position` —
 * positions are sparse by design (removing an item leaves a gap, see
 * `playlist_items`), so showing the stored value would count 1, 2, 4.
 */
defineProps<{ item: PlaylistItem; index: number }>()
</script>

<template>
  <NuxtLink
    :to="`/watch/${encodeURIComponent(item.slug)}`"
    class="flex gap-4 rounded-lg p-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span class="w-5 shrink-0 self-center text-right text-xs text-muted-foreground tabular-nums">
      {{ index }}
    </span>

    <div class="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
      <img
        :src="item.image"
        :alt="item.title"
        width="320"
        height="180"
        loading="lazy"
        class="size-full object-cover"
      />
      <span
        v-if="item.duration"
        class="absolute bottom-1 right-1 rounded-sm bg-background/90 px-1 py-0.5 text-[10px] font-semibold text-foreground"
        >{{ item.duration }}</span
      >
    </div>

    <div class="min-w-0 flex-1 pr-8">
      <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
        {{ item.title }}
      </h3>
      <p class="mt-1 truncate text-xs text-muted-foreground">{{ item.channel }}</p>
      <p class="truncate text-xs text-muted-foreground">{{ item.meta }}</p>
    </div>
  </NuxtLink>
</template>
