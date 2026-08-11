<script lang="ts" setup>
import {Motion} from 'motion-v'
import {ChevronLeft, ChevronRight, Play} from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import type {Short} from '#shared/types/shorts'

const props = defineProps<{
  shorts: Short[]
  title?: string
}>()

const activeIndex = ref(0)
const direction = ref<1 | -1>(1)

const isLargeDesktop = useMediaQuery('(min-width: 1280px)')

const total = computed(() => props.shorts.length)

const normalizeIndex = (index: number) => {
  if (!total.value) return 0

  return ((index % total.value) + total.value) % total.value
}

/**
 * Returns the shortest circular distance from the active slide.
 *
 * Example:
 * active = 0
 *
 * index 0 ->  0
 * index 1 ->  1
 * index 2 ->  2
 * index 9 -> -1  // previous slide when there are 10 items
 */
const getOffset = (index: number) => {
  if (!total.value) return 0

  let offset = index - activeIndex.value

  if (offset > total.value / 2) {
    offset -= total.value
  }

  if (offset < -total.value / 2) {
    offset += total.value
  }

  return offset
}

const next = () => {
  if (total.value <= 1) return

  direction.value = 1
  activeIndex.value = normalizeIndex(activeIndex.value + 1)
}

const previous = () => {
  if (total.value <= 1) return

  direction.value = -1
  activeIndex.value = normalizeIndex(activeIndex.value - 1)
}

const goTo = (index: number) => {
  if (index === activeIndex.value) return

  direction.value = index > activeIndex.value ? 1 : -1
  activeIndex.value = index
}

/**
 * Every card gets a visual position based on its distance
 * from the active slide.
 */
const getCardStyle = (index: number) => {
  const offset = getOffset(index)
  const desktop = isLargeDesktop.value

  // CENTER
  if (offset === 0) {
    return {
      x: 0,
      scale: desktop ? 1 : 1,
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
    }
  }

  // IMMEDIATE LEFT / RIGHT
  if (Math.abs(offset) === 1) {
    return {
      x: offset > 0
          ? desktop ? 255 : 190
          : desktop ? -255 : -190,

      scale: desktop ? 0.82 : 0.82,
      opacity: desktop ? 0.55 : 0.35,
      zIndex: 20,
      filter: 'blur(0px)',
    }
  }

  // SECOND LEFT / RIGHT
  if (Math.abs(offset) === 2) {
    return {
      x: offset > 0
          ? desktop ? 475 : 340
          : desktop ? -475 : -340,

      scale: desktop ? 0.70 : 0.68,
      opacity: desktop ? 0.28 : 0,
      zIndex: 10,
      filter: desktop ? 'blur(0px)' : 'blur(2px)',
    }
  }

  // Everything else
  return {
    x: offset > 0 ? 650 : -650,
    scale: 0.6,
    opacity: 0,
    zIndex: 0,
    filter: 'blur(3px)',
  }
}
const cardTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}

const handleDragEnd = (
    _event: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
) => {
  const distance = info.offset.x
  const velocity = info.velocity.x

  if (distance < -60 || velocity < -500) {
    next()
  }

  if (distance > 60 || velocity > 500) {
    previous()
  }
}
</script>

<template>
  <section
      v-if="shorts.length"
      class="w-full overflow-hidden"
  >
    <!-- Header -->
    <div class="mb-5 flex items-center justify-between px-1">
      <div>
        <h2 class="text-xl font-bold tracking-tight sm:text-2xl">
          {{ title ?? 'Shorts' }}
        </h2>

        <p class="mt-1 text-sm text-muted-foreground">
          Quick videos worth watching
        </p>
      </div>

      <!-- Desktop controls -->
      <div class="hidden items-center gap-2 sm:flex">
        <button
            :disabled="total <= 1"
            aria-label="Previous short"
            class="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background transition hover:bg-muted active:scale-95 disabled:opacity-30"
            type="button"
            @click="previous"
        >
          <ChevronLeft class="size-4"/>
        </button>

        <button
            :disabled="total <= 1"
            aria-label="Next short"
            class="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background transition hover:bg-muted active:scale-95 disabled:opacity-30"
            type="button"
            @click="next"
        >
          <ChevronRight class="size-4"/>
        </button>
      </div>
    </div>

    <!-- Carousel -->
    <div
        class="relative flex h-[470px] w-full items-center justify-center overflow-hidden sm:h-[530px]"
    >
      <!-- Soft side fade -->
      <div
          class="pointer-events-none absolute inset-y-0 left-0 z-40 w-20 bg-linear-to-r from-background to-transparent sm:w-32"
      />

      <div
          class="pointer-events-none absolute inset-y-0 right-0 z-40 w-20 bg-linear-to-l from-background to-transparent sm:w-32"
      />

      <!-- Cards -->
      <Motion
          v-for="(short, index) in shorts"
          :key="short.id"
          :animate="getCardStyle(index)"
          :drag="getOffset(index) === 0 ? 'x' : false"
          :drag-constraints="{ left: 0, right: 0 }"
          :drag-elastic="0.15"
          :transition="cardTransition"
          :while-drag="{
    scale: 0.98,
  }"
          class="absolute left-1/2 top-1/2 w-[220px] -translate-x-1/2 -translate-y-1/2 sm:w-[240px] md:w-[250px] xl:w-[230px]"
          @drag-end="handleDragEnd"
      >
        <NuxtLink
            :tabindex="getOffset(index) === 0 ? 0 : -1"
            :to="`/shorts?v=${encodeURIComponent(short.id)}`"
            class="group block"
        >
          <!-- Card -->
          <div
              class="relative aspect-9/16 overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 ring-black/5"
          >
            <!-- Poster -->
            <img
                :alt="short.title"
                :src="short.posterUrl"
                class="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                decoding="async"
                height="720"
                loading="lazy"
                width="405"
            />

            <!-- Bottom gradient -->
            <div
                class="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black via-black/50 to-transparent"
            />

            <!-- Play -->
            <div
                class="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
            >
              <Play class="ml-1 size-6 fill-current"/>
            </div>

            <!-- Content -->
            <div
                class="absolute inset-x-0 bottom-0 p-4"
            >
              <h3
                  class="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base"
              >
                {{ short.title }}
              </h3>

              <div class="mt-2 flex items-center gap-2">
                <ChannelAvatar
                    :image="short.avatarUrl"
                    :name="short.channel"
                    aria-hidden="true"
                    class="size-5 shrink-0"
                />

                <span
                    class="truncate text-xs font-medium text-white/70"
                >
                  {{ short.views }} views
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </Motion>
    </div>

    <!-- Pagination -->
    <div class="mt-3 flex items-center justify-center gap-1.5">
      <button
          v-for="(_, index) in shorts"
          :key="index"
          :aria-label="`Go to slide ${index + 1}`"
          :class="
          index === activeIndex
            ? 'w-6 bg-foreground'
            : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'
        "
          class="h-1.5 rounded-full transition-all duration-300"
          type="button"
          @click="goTo(index)"
      />
    </div>
  </section>
</template>