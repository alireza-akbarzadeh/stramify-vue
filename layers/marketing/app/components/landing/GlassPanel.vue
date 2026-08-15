<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <div
    :class="
      cn(
        'rounded-2xl border border-border bg-card/70 shadow-[0_24px_60px_-20px_var(--shadow-color)] backdrop-blur-xl',
        props.class
      )
    "
  >
    <slot />
  </div>
</template>
