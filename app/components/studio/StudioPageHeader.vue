<script lang="ts" setup>
/**
 * The heading every studio page opens with.
 *
 * The studio shell (`layouts/studio.vue`) deliberately carries no page title —
 * one bar sits above the dashboard, the content table and the uploader alike —
 * so each page owns its own `h1`. This component is that `h1` plus the one
 * place a page-level action belongs, which keeps the three pages agreeing on
 * spacing and type scale instead of each inventing them.
 */
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {{ description }}
      </p>
    </div>

    <!-- Wraps below the heading on phones rather than squeezing beside it. -->
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions"/>
    </div>
  </header>
</template>
