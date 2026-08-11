<script setup lang="ts">
import { ListVideo, Play } from '@lucide/vue'

/**
 * A collection of videos, drawn as a stack of its first few thumbnails.
 *
 * Shared by mix cards and playlist cards, which are the same idea wearing
 * different labels — "a list you can open and play". One thumbnail would read
 * as a single video, so the stack (a full-size lead image with two narrower,
 * dimmer slabs peeking above it) is what makes it legible as a list at a
 * glance. It's the grammar YouTube uses, which means viewers already know what
 * a click does.
 *
 * The slabs are `aria-hidden`: they carry nothing the count and title don't
 * already say, and announcing three decorative images per card would bury the
 * link they sit inside.
 */
const props = defineProps<{
  /** Highest-ranked first. Empty renders the placeholder instead of a broken image. */
  covers: string[]
  /** Shown on the right-hand plate, e.g. `12`. */
  count: number
  /** Alt text for the lead image — the collection's title. */
  alt: string
}>()

const backing = computed(() => props.covers.slice(1, 3))
</script>

<template>
  <div class="relative pt-2.5">
    <!-- Stacked edges, narrowest and faintest at the back. -->
    <div
      v-for="(cover, index) in backing"
      :key="cover"
      class="absolute inset-x-0 top-0 mx-auto overflow-hidden rounded-t-lg bg-muted"
      :class="index === 0 ? 'h-2.5 w-[82%] opacity-40' : 'h-1.5 w-[90%] opacity-70'"
      aria-hidden="true"
    >
      <img :src="cover" alt="" class="size-full object-cover" />
    </div>

    <div class="relative aspect-video overflow-hidden rounded-xl bg-muted">
      <img
        v-if="covers.length"
        :src="covers[0]"
        :alt="alt"
        width="960"
        height="540"
        loading="lazy"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div v-else class="flex size-full items-center justify-center">
        <ListVideo class="size-8 text-muted-foreground" aria-hidden="true" />
      </div>

      <!-- The plate says what this is: a list, and how long. -->
      <div
        class="absolute inset-y-0 right-0 flex w-2/5 flex-col items-center justify-center gap-1 bg-background/80 backdrop-blur-sm"
      >
        <ListVideo class="size-5 text-foreground" aria-hidden="true" />
        <span class="text-xs font-semibold text-foreground">{{ count }} videos</span>
      </div>

      <div
        class="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Play class="size-4 fill-current" aria-hidden="true" />
          Play all
        </span>
      </div>
    </div>
  </div>
</template>
