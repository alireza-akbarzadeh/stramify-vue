<script setup lang="ts">
import { BookmarkCheck, Play } from '@lucide/vue'
import type { WatchlistItem } from '#shared/types/discovery'
import { Button } from '@/components/ui/button'
import LiveBadge from '@/components/LiveBadge.vue'

defineProps<{ item: WatchlistItem; live?: boolean }>()
const emit = defineEmits<{ (e: 'open' | 'remove'): void }>()
</script>

<template>
  <article class="group space-y-3">
    <div class="relative">
      <button
        type="button"
        :aria-label="`Open ${item.title}`"
        class="relative block aspect-video w-full overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('open')"
      >
        <img
          :src="item.image"
          :alt="item.title"
          width="960"
          height="540"
          loading="lazy"
          class="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <LiveBadge v-if="live" class="absolute left-3 top-3" />
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
      <Button
        type="button"
        size="icon"
        variant="ghost"
        :aria-label="`Remove ${item.title} from watchlist`"
        class="absolute right-2 top-2 size-9 rounded-full bg-background/80 text-primary backdrop-blur-sm hover:bg-background"
        @click="emit('remove')"
      >
        <BookmarkCheck />
      </Button>
    </div>
    <div>
      <h3
        class="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary"
      >
        {{ item.title }}
      </h3>
      <div class="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p class="truncate">{{ item.creator }}</p>
        <p class="shrink-0">{{ item.meta }}</p>
      </div>
    </div>
  </article>
</template>
