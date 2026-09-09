<script setup lang="ts">
import { Play, X } from '@lucide/vue'
import type { RelatedItem } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { AUTOPLAY_COUNTDOWN_SECONDS } from '@/utils/autoplay'

defineProps<{ next: RelatedItem }>()
const emit = defineEmits<{ (e: 'play' | 'cancel'): void }>()

/**
 * The "Up next" card over a finished video, with a countdown the viewer can
 * stop. The delay is the whole point: auto-advancing the instant a video ends
 * takes the decision away, and a visible timer with a cancel button hands it
 * back without making anyone click to continue.
 */
const remaining = ref(AUTOPLAY_COUNTDOWN_SECONDS)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      stop()
      emit('play')
    }
  }, 1000)
})

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

onBeforeUnmount(stop)

function cancel() {
  stop()
  emit('cancel')
}

/** Ring geometry for the countdown dial around the play button. */
const CIRCUMFERENCE = 2 * Math.PI * 22
const dash = computed(() => (remaining.value / AUTOPLAY_COUNTDOWN_SECONDS) * CIRCUMFERENCE)
</script>

<template>
  <!--
    `role="dialog"` with a label, because this appears unprompted over the video
    and is about to navigate: a screen reader user needs to hear that it arrived
    and that there is a way out, not discover it after the page has changed.
  -->
  <div
    :aria-label="`Up next: ${next.title}. Playing in ${remaining} seconds.`"
    class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/92 px-6 text-center backdrop-blur-sm"
    role="dialog"
  >
    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Up next</p>

    <div class="flex items-center gap-4">
      <img
        :src="next.image"
        alt=""
        class="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
        loading="lazy"
      >
      <div class="min-w-0 text-left">
        <p class="line-clamp-2 text-base font-semibold text-foreground">{{ next.title }}</p>
        <p class="mt-1 truncate text-sm text-muted-foreground">{{ next.channel }}</p>
      </div>
    </div>

    <button
      :aria-label="`Play ${next.title} now`"
      class="relative grid size-14 cursor-pointer place-items-center rounded-full text-primary transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      @click="stop(); emit('play')"
    >
      <svg class="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="3" opacity="0.2" />
        <!--
          `transition` on the dash rather than a CSS animation: the value is
          driven by the same `remaining` the label reads, so the dial can never
          disagree with the number next to it.
        -->
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="CIRCUMFERENCE - dash"
          class="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <Play class="size-6 fill-current" aria-hidden="true" />
    </button>

    <Button size="sm" type="button" variant="outline" @click="cancel">
      <X aria-hidden="true" />
      Cancel
    </Button>
  </div>
</template>
