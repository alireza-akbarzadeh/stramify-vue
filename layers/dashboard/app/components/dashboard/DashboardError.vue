<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{ title: string; description: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="rounded-xl border border-dashed border-destructive/40 py-16 text-center">
    <p class="text-lg font-semibold text-foreground">{{ title }}</p>
    <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    <Button type="button" variant="outline" size="sm" class="mt-4" @click="$emit('retry')">Retry</Button>
  </div>
</template>
