<script setup lang="ts">
import { BarChart3, Clock, Radio } from '@lucide/vue'

const items = [
  {
    to: '/dashboard/analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'Follower growth, engagement, and clip performance — live now.',
    phase: 'Available',
    label: 'Creator System'
  },
  {
    to: '/dashboard/stream',
    icon: Radio,
    title: 'Go live',
    description: 'Ingest URL, stream key, title, and category for your broadcast.',
    phase: 'Phase 7',
    label: 'Live Streaming'
  }
]
</script>

<template>
  <div class="rounded-2xl border border-border bg-card p-6">
    <h3 class="flex items-center gap-2 text-base font-semibold text-foreground">
      <Clock class="size-4.5 text-foreground" aria-hidden="true" />
      Creator tools roadmap
    </h3>
    <p class="mt-1 text-sm text-muted-foreground">Built in phase order — here's what's next.</p>

    <ol class="mt-6 flex flex-col">
      <li v-for="(item, i) in items" :key="item.to" class="relative flex gap-4 pb-6 last:pb-0">
        <div class="flex flex-col items-center">
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-foreground">
            <component :is="item.icon" class="size-4" aria-hidden="true" />
          </span>
          <span v-if="i < items.length - 1" class="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        </div>

        <NuxtLink :to="item.to" class="group -mt-0.5 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-foreground group-hover:underline">{{ item.title }}</span>
            <span class="inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {{ item.phase }}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-muted-foreground">{{ item.description }}</p>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>
