<script setup lang="ts">
import type { Short } from '#shared/types/shorts'
import { useShortsKeys } from '@/composables/useShortsKeys'
import { useSnapReel } from '@/composables/useSnapReel'
import { useShortsStore } from '@/stores/shorts'
import ShortsNav from './ShortsNav.vue'
import ShortsSlide from './ShortsSlide.vue'

/**
 * The scroller: a full-height, snap-aligned column of shorts.
 *
 * Scrolling happens inside this element rather than on the page so the app's
 * sidebar and top bar stay put and the browser's own overscroll never joins
 * in mid-flick. `overscroll-contain` is what stops a flick past the last short
 * from turning into a pull-to-refresh.
 */
const props = defineProps<{ items: Short[]; hasMore: boolean; loadingMore: boolean }>()
const emit = defineEmits<{ (e: 'load-more'): void }>()

const container = ref<HTMLElement | null>(null)
const count = computed(() => props.items.length)
const { index, step } = useSnapReel(container, count)

useShortsKeys(step)

const shorts = useShortsStore()
const router = useRouter()

watch(
  index,
  (position) => {
    const current = props.items[position]
    if (!current) return
    shorts.setActive(current.id)
    // The address bar always names the short on screen, so Share and a browser
    // reload both land back here. `replace` because scrolling a feed is not
    // fifteen entries in the viewer's back history.
    router.replace({ query: { v: current.id } })
    // Fetch the next page a couple of shorts before the end — after it, the
    // viewer is already looking at the bottom of the feed.
    if (props.hasMore && !props.loadingMore && position >= count.value - 3) emit('load-more')
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full min-h-0">
    <div
      ref="container"
      class="h-full flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      tabindex="-1"
    >
      <ShortsSlide
        v-for="(short, position) in items"
        :key="short.id"
        :short="short"
        :distance="Math.abs(position - index)"
      />

      <p v-if="loadingMore" class="sr-only" role="status">Loading more shorts</p>
    </div>

    <ShortsNav
      :at-start="index === 0"
      :at-end="index >= count - 1 && !hasMore"
      @step="step($event)"
    />
  </div>
</template>
