<script setup lang="ts">
import type { Component } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  icon: Component
  title: string
  body: string
  class?: string
}>()
</script>

<template>
  <div
    :class="
      cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_28px_60px_-24px_var(--shadow-color)]',
        props.class
      )
    "
  >
    <!-- Hover sheen -->
    <div
      class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden"
      aria-hidden="true"
    />
    <div class="relative">
      <div class="grid size-10 place-items-center rounded-xl border border-border bg-foreground/5 text-primary">
        <component :is="icon" class="size-5" aria-hidden="true" />
      </div>
      <h3 class="mt-4 text-base font-semibold text-foreground">{{ title }}</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ body }}</p>
      <slot />
    </div>
  </div>
</template>
