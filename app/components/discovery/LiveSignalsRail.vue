<script setup lang="ts">
import { ArrowLeft, ArrowRight, Play } from '@lucide/vue'
import type { LiveSignal } from '#shared/types/discovery'
import { Button } from '@/components/ui/button'
import LiveBadge from '@/components/LiveBadge.vue'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { liveToItem } from '@/utils/watchlist'
import SaveButton from './SaveButton.vue'

defineProps<{ signals: LiveSignal[] }>()
const emit = defineEmits<{ (e: 'play', signal: LiveSignal): void }>()

const saved = useSavedVideos()
const rail = useTemplateRef<HTMLDivElement>('rail')

function scroll(direction: 'left' | 'right') {
  rail.value?.scrollBy({ left: direction === 'right' ? 320 : -320, behavior: 'smooth' })
}
</script>

<template>
  <section aria-labelledby="live-signals-heading">
    <div class="mb-6 flex items-center justify-between">
      <h2
        id="live-signals-heading"
        class="flex items-center gap-2 text-lg font-semibold text-foreground"
      >
        Live Signals
        <span
          class="size-1.5 rounded-full bg-primary animate-[pulse-ring_2s_ease-out_infinite] motion-reduce:animate-none"
          aria-hidden="true"
        />
      </h2>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Scroll live signals left"
          class="size-9"
          @click="scroll('left')"
        >
          <ArrowLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Scroll live signals right"
          class="size-9"
          @click="scroll('right')"
        >
          <ArrowRight />
        </Button>
      </div>
    </div>

    <div ref="rail" class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none">
      <div
        v-for="signal in signals"
        :key="signal.id"
        class="group w-64 shrink-0 snap-start space-y-3"
      >
        <div class="relative">
          <button
            type="button"
            :aria-label="`Watch ${signal.name}`"
            class="relative block aspect-video w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="emit('play', signal)"
          >
            <img
              :src="signal.image"
              :alt="`${signal.name} live stream`"
              width="512"
              height="288"
              loading="lazy"
              class="size-full object-cover transition duration-500 group-hover:scale-105"
            />
            <LiveBadge class="absolute left-3 top-3" />
            <span
              class="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition group-hover:opacity-100"
            >
              <Play class="size-8 fill-current text-white" />
            </span>
          </button>
          <SaveButton
            :saved="saved.isSaved(signal.id, 'live')"
            :label="signal.name"
            kind="live"
            class="absolute right-3 top-3"
            @toggle="saved.toggle(liveToItem(signal))"
          />
        </div>
        <div class="flex items-center justify-between gap-2 text-xs">
          <span class="truncate font-semibold text-foreground">{{ signal.name }}</span>
          <span class="shrink-0 text-muted-foreground">{{ signal.viewers }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
