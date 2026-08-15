<script setup lang="ts">
defineProps<{ user: string; color: string; text: string }>()
</script>

<template>
  <div class="flex gap-2 text-[13px] leading-snug">
    <span class="shrink-0 font-semibold" :style="{ color }">{{ user }}</span>
    <span class="text-muted-foreground">{{ text }}</span>
  </div>
</template>
