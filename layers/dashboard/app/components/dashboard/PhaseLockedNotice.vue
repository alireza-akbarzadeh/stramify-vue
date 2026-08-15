<script setup lang="ts">
import { Lock } from '@lucide/vue'

defineProps<{ phase: string; description: string }>()
</script>

<template>
  <div class="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-2/60 p-4">
    <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted-foreground">
      <Lock class="size-4" aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <p class="flex items-center gap-2 text-sm font-semibold text-foreground">
        Not built yet
        <span class="inline-flex items-center rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ phase }}
        </span>
      </p>
      <p class="mt-1 text-xs text-muted-foreground">{{ description }}</p>
    </div>
  </div>
</template>
