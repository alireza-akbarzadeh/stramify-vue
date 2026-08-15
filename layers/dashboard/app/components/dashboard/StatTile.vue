<script setup lang="ts">
import type { Component } from 'vue'
import { ChevronRight } from '@lucide/vue'

defineProps<{
  icon: Component
  label: string
  value: string
  hint?: string
  to?: string
}>()
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    class="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors"
    :class="to ? 'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''"
  >
    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-foreground">
      <component :is="icon" class="size-5" aria-hidden="true" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-xl font-semibold text-foreground">{{ value }}</p>
      <p class="truncate text-xs text-muted-foreground">{{ label }}{{ hint ? ` · ${hint}` : '' }}</p>
    </div>
    <ChevronRight v-if="to" class="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
  </component>
</template>
