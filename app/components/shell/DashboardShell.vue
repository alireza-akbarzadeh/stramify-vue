<script setup lang="ts">
/**
 * A dashboard page's heading block.
 *
 * The sidebar and top bar used to live here, which is exactly why they only
 * ever appeared on `/dashboard`. They moved to `layouts/dashboard.vue` so that
 * every app route gets them; what's left here is the part that genuinely is
 * per-page — the `h1`, its subtitle, and the actions beside them.
 */
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </div>
</template>
