<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{ class?: string }>(), { class: undefined })
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground',
        props.class
      )
    "
  >
    <span
      class="size-1.5 rounded-full bg-white animate-[pulse-ring_2s_ease-out_infinite] motion-reduce:animate-none"
      aria-hidden="true"
    />
    Live
  </span>
</template>
