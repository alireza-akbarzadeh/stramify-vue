```vue
<script lang="ts" setup>
import {ChevronLeft, ChevronRight, Play} from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import type {Short} from '#shared/types/shorts'

const props = defineProps<{
  shorts: Short[]
  title?: string
  subtitle?: string
}>()

const carousel = ref<HTMLElement | null>(null)

const canScrollLeft = ref(false)
const canScrollRight = ref(true)

const updateScrollState = () => {
  const el = carousel.value

  if (!el) return

  canScrollLeft.value = el.scrollLeft > 8

  canScrollRight.value =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 8
}

const scroll = (direction: 'left' | 'right') => {
  const el = carousel.value

  if (!el) return

  el.scrollBy({
    left:
        direction === 'right'
            ? Math.min(el.clientWidth * 0.8, 700)
            : -Math.min(el.clientWidth * 0.8, 700),
    behavior: 'smooth',
  })
}

const to = (id: string) => `/shorts?v=${encodeURIComponent(id)}`

onMounted(() => {
  updateScrollState()
  window.addEventListener('resize', updateScrollState)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollState)
})
</script>

<template>
  <section class="relative min-w-0 w-full overflow-hidden">
    <!-- Header -->
    <div class="mb-5 flex items-end justify-between gap-4">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <div
              class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Play class="size-4 fill-current"/>
          </div>

          <h2
              class="truncate text-xl font-bold tracking-tight sm:text-2xl"
          >
            {{ title ?? 'Shorts' }}
          </h2>
        </div>

        <p
            v-if="subtitle"
            class="mt-1 text-sm text-muted-foreground"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- Navigation -->
      <div class="hidden shrink-0 items-center gap-2 sm:flex">
        <button
            :disabled="!canScrollLeft"
            aria-label="Previous shorts"
            class="flex size-9 items-center justify-center rounded-full border border-border bg-background transition hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
            type="button"
            @click="scroll('left')"
        >
          <ChevronLeft class="size-4"/>
        </button>

        <button
            :disabled="!canScrollRight"
            aria-label="Next shorts"
            class="flex size-9 items-center justify-center rounded-full border border-border bg-background transition hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
            type="button"
            @click="scroll('right')"
        >
          <ChevronRight class="size-4"/>
        </button>
      </div>
    </div>

    <!-- Carousel -->
    <div class="relative min-w-0">
      <div
          ref="carousel"
          class="flex min-w-0 gap-3 overflow-x-auto overscroll-x-contain pb-4 touch-pan-x snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
          @scroll="updateScrollState"
      >
        <NuxtLink
            v-for="short in props.shorts"
            :key="short.id"
            :to="to(short.id)"
            class="group w-[155px] shrink-0 snap-start sm:w-[175px] md:w-[190px] lg:w-[205px] xl:w-[215px]"
        >
          <!-- Poster -->
          <div
              class="relative aspect-9/16 overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border/50 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
          >
            <img
                :alt="short.title"
                :src="short.posterUrl"
                class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                decoding="async"
                height="720"
                loading="lazy"
                width="405"
            />

            <!-- Gradient -->
            <div
                class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-transparent"
            />

            <!-- Play -->
            <div
                class="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
            >
              <Play class="ml-0.5 size-4 fill-current"/>
            </div>

            <!-- Content -->
            <div class="absolute inset-x-0 bottom-0 p-3">
              <h3
                  class="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow"
              >
                {{ short.title }}
              </h3>

              <div class="mt-2 flex min-w-0 items-center gap-1.5">
                <ChannelAvatar
                    :image="short.avatarUrl"
                    :name="short.channel"
                    aria-hidden="true"
                    class="size-5 shrink-0 ring-1 ring-white/20"
                />

                <span class="truncate text-xs text-white/75">
                  {{ short.views }}
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>

        <!-- End spacing -->
        <div class="w-1 shrink-0"/>
      </div>

      <!-- Right fade -->
      <div
          v-if="canScrollRight"
          class="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-linear-to-l from-background via-background/70 to-transparent sm:block"
      />
    </div>
  </section>
</template>
```
