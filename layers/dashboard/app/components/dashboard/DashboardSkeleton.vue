<script setup lang="ts">
withDefaults(defineProps<{ panels?: number; tiles?: number }>(), { panels: 2, tiles: 4 })
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="n in tiles" :key="n" class="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
    <div v-for="n in panels" :key="n" class="h-56 animate-pulse rounded-2xl bg-muted" />
  </div>
</template>
