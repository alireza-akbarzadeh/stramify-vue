<script setup lang="ts">
import { Clapperboard } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useShortsFeed } from '@/composables/useShortsFeed'
import { useShortsStore } from '@/stores/shorts'
import ShortsComments from './ShortsComments.vue'
import ShortsReel from './ShortsReel.vue'
import ShortsSkeleton from './ShortsSkeleton.vue'

/**
 * `/shorts`: the feed's four states — loading, failed, empty, and the reel.
 *
 * The height is pinned rather than left to flow because a snap scroller needs
 * a fixed box to snap inside. It subtracts the app shell's top bar, and on
 * phones the fixed tab bar underneath as well, so exactly one short is on
 * screen and nothing is hidden behind either.
 */
const props = defineProps<{ startId: string | null }>()

const { query, items } = useShortsFeed(props.startId)
const shorts = useShortsStore()

// Leaving the page must stop playback: the store outlives this component, and
// a stale `activeId` would have the next visit resume a short that isn't
// mounted any more.
onBeforeUnmount(() => shorts.setActive(null))
</script>

<template>
  <div
    class="h-[calc(100dvh-4rem-3.5rem-env(safe-area-inset-bottom))] w-full md:h-[calc(100dvh-4rem)]"
  >
    <ShortsSkeleton v-if="query.isPending.value" />

    <div
      v-else-if="query.isError.value"
      class="grid h-full place-items-center px-6 text-center"
    >
      <div>
        <h1 class="text-lg font-semibold text-foreground">Couldn't load shorts</h1>
        <p class="mt-2 text-sm text-muted-foreground">Something went wrong on our side.</p>
        <Button type="button" variant="outline" size="sm" class="mt-4" @click="query.refetch()">
          Retry
        </Button>
      </div>
    </div>

    <div v-else-if="!items.length" class="grid h-full place-items-center px-6 text-center">
      <div>
        <Clapperboard class="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h1 class="mt-4 text-lg font-semibold text-foreground">No shorts yet</h1>
        <p class="mt-2 max-w-sm text-sm text-muted-foreground">
          Vertical uploads land here as soon as creators publish them. In the meantime there are
          full-length clips and live channels to watch.
        </p>
        <Button as-child size="sm" class="mt-6">
          <NuxtLink to="/clips">Browse clips</NuxtLink>
        </Button>
      </div>
    </div>

    <ShortsReel
      v-else
      :items="items"
      :has-more="query.hasNextPage.value"
      :loading-more="query.isFetchingNextPage.value"
      @load-more="query.fetchNextPage()"
    />

    <ShortsComments />
  </div>
</template>
