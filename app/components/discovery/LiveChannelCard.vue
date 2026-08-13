<script setup lang="ts">
import type { LiveSignal } from '#shared/types/discovery'
import LiveBadge from '@/components/landing/LiveBadge.vue'
import { Play, Users } from '@lucide/vue'
import SaveButton from './SaveButton.vue'

defineProps<{ signal: LiveSignal; saved: boolean }>()
const emit = defineEmits<{ (e: 'play' | 'toggle-save'): void }>()
</script>

<template>
  <article class="group space-y-3 cursor-pointer">
    <div class="relative">
      <button
        type="button"
        :aria-label="`Watch ${signal.name} live: ${signal.title}`"
        class="relative block aspect-video w-full overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('play')"
      >
        <img
          :src="signal.image"
          :alt="`${signal.name} live stream`"
          width="960"
          height="540"
          loading="lazy"
          class="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <LiveBadge class="absolute left-2 top-2" />
        <span
          class="absolute bottom-2 left-2 flex items-center gap-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
        >
          <Users class="size-3" aria-hidden="true" />
          {{ signal.viewers }}
        </span>
        <span
          class="absolute bottom-2 right-2 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
          >{{ signal.uptime }}</span
        >
        <span
          class="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition group-hover:opacity-100"
        >
          <span
            class="flex size-10 items-center justify-center rounded-full bg-foreground text-background"
          >
            <Play class="size-4 fill-current" />
          </span>
        </span>
      </button>
      <SaveButton
        :saved="saved"
        :label="signal.name"
        kind="live"
        class="absolute right-2 top-2"
        @toggle="emit('toggle-save')"
      />
    </div>
    <div>
      <h3
        class="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary"
      >
        {{ signal.title }}
      </h3>
      <div class="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p class="truncate">{{ signal.name }}</p>
        <p class="shrink-0">{{ signal.category }}</p>
      </div>
    </div>
  </article>
</template>
