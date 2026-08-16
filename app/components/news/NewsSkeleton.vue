<script setup lang="ts">
/**
 * The shape `/news` settles into: one wide hero, then a grid of cards.
 *
 * Sized to the real thing (same aspect ratios, same gaps, same column count at
 * each breakpoint) so the page doesn't jump when the data lands — a skeleton
 * whose blocks are the wrong height is a layout shift with extra steps.
 */
</script>

<template>
  <div class="space-y-10" aria-hidden="true">
    <div class="grid overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
      <div class="aspect-[16/9] animate-pulse bg-muted lg:aspect-auto lg:min-h-[22rem]" />
      <div class="space-y-4 p-6 sm:p-8">
        <div class="h-5 w-24 animate-pulse rounded-full bg-muted" />
        <div class="h-7 w-4/5 animate-pulse rounded bg-muted" />
        <div class="h-4 w-full animate-pulse rounded bg-muted" />
        <div class="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
      <div v-for="n in 6" :key="n" class="overflow-hidden rounded-xl border border-border">
        <div class="aspect-[16/9] animate-pulse bg-muted" />
        <div class="space-y-3 p-4">
          <div class="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div class="h-3 w-full animate-pulse rounded bg-muted" />
          <div class="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  </div>
</template>
