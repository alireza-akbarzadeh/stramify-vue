<script setup lang="ts">
import { AlertCircle, CheckCircle2 } from '@lucide/vue'

const props = withDefaults(defineProps<{ message: string; tone?: 'error' | 'success' }>(), {
  tone: 'error'
})

const isError = computed(() => props.tone === 'error')
</script>

<template>
  <!-- role=alert so the message is announced, not just visually shown. -->
  <p
    role="alert"
    :class="[
      'flex items-start gap-2 rounded-xl border p-3 text-sm',
      isError
        ? 'border-destructive/40 bg-destructive/10 text-destructive'
        : 'border-success/40 bg-success/10 text-success'
    ]"
  >
    <component :is="isError ? AlertCircle : CheckCircle2" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    {{ message }}
  </p>
</template>
