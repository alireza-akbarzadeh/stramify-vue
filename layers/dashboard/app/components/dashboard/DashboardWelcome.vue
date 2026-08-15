<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { user } = storeToRefs(useAuthStore())

const initial = computed(() => (user.value?.name || user.value?.email || '?').charAt(0).toUpperCase())

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => user.value?.name?.split(' ')[0] ?? 'there')
</script>

<template>
  <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    <div
      class="grid size-14 shrink-0 place-items-center rounded-full border border-border bg-glass text-lg font-semibold text-foreground backdrop-blur"
      aria-hidden="true"
    >
      <img v-if="user?.image" :src="user.image" alt="" class="size-full rounded-full object-cover">
      <span v-else>{{ initial }}</span>
    </div>

    <div>
      <h1 class="text-2xl font-semibold text-foreground sm:text-3xl">{{ greeting }}, {{ firstName }}</h1>
      <p class="mt-1 max-w-lg text-sm text-muted-foreground sm:text-base">
        This is your creator hub — manage your stream, track growth, and keep your account secure, all in one place.
      </p>
    </div>
  </div>
</template>
