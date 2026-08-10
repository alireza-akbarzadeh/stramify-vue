<script setup lang="ts">
/**
 * First-paint placeholder, shaped like a slide rather than a spinner: the same
 * 9:16 frame in the same place, so the real short lands into a box that is
 * already there instead of shifting the page under it.
 */
</script>

<template>
  <div class="flex h-full items-center justify-center" role="status" aria-label="Loading shorts">
    <div
      class="relative h-full w-full overflow-hidden bg-muted sm:aspect-[9/16] sm:h-full sm:w-auto sm:rounded-2xl"
    >
      <div class="absolute inset-0 animate-pulse bg-gradient-to-b from-muted to-surface-2" />

      <div class="absolute inset-x-0 bottom-0 space-y-3 p-4 pr-16">
        <div class="flex items-center gap-2.5">
          <div class="size-9 animate-pulse rounded-full bg-foreground/15" />
          <div class="h-3 w-28 animate-pulse rounded bg-foreground/15" />
        </div>
        <div class="h-4 w-3/4 animate-pulse rounded bg-foreground/15" />
        <div class="h-3 w-1/2 animate-pulse rounded bg-foreground/10" />
      </div>

      <div class="absolute bottom-28 right-2 space-y-4">
        <div v-for="n in 5" :key="n" class="size-11 animate-pulse rounded-full bg-foreground/15" />
      </div>
    </div>
  </div>
</template>
