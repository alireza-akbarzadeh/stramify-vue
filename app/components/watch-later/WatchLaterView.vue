<script setup lang="ts">
import { toast } from 'vue-sonner'
import HomeVideoCardSkeleton from '@/components/home/HomeVideoCardSkeleton.vue'
import HomeWatchLaterCard from '@/components/home/HomeWatchLaterCard.vue'
import { Button } from '@/components/ui/button'
import { useRemoveFromWatchLater, useWatchLater } from '@/composables/useWatchLater'
import { useAuthStore } from '@/stores/auth'
import WatchLaterEmpty from './WatchLaterEmpty.vue'

/**
 * `/watch-later` — the full queue the home rail shows the first ten of.
 *
 * A grid rather than the list rows `/history` uses: history is chronological
 * and you scan down it, a queue is a set of things you're choosing between and
 * a wall of thumbnails is how you choose. It renders the same card as the rail
 * so a saved video looks identical on both surfaces.
 *
 * The default `limit` is the API's maximum, which is deliberately *not* paged:
 * a queue you have to scroll through in pages has stopped being a queue and
 * become a backlog. If that ceiling ever bites, the fix is paging here, not a
 * bigger number.
 */
const auth = useAuthStore()
const { data, isPending, isError, refetch } = useWatchLater()
const remove = useRemoveFromWatchLater()

/**
 * A disabled TanStack query stays `pending` forever, so every signed-in-only
 * surface has to check the session before trusting it — otherwise a logged-out
 * visitor gets skeletons that never resolve. Same guard as `HistoryView`.
 */
const signedIn = computed(() => auth.isAuthenticated)
const pending = computed(() => signedIn.value && isPending.value)
const items = computed(() => data.value ?? [])

function onRemove(clipId: string) {
  remove.mutate(clipId, {
    onError: () => toast.error("Couldn't remove that from Watch later.")
  })
}

/**
 * Written out in full rather than composed, because Tailwind scans source text
 * — same reason `HomeVideoGrid` spells its grid out.
 */
const GRID = 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
const SKELETONS = 8
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
    <header class="py-6">
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Watch later</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Videos you saved to come back to, newest first.
      </p>
    </header>

    <WatchLaterEmpty v-if="!signedIn" :signed-in="false" />

    <div v-else-if="pending" :class="GRID" aria-label="Loading your saved videos" role="status">
      <HomeVideoCardSkeleton v-for="n in SKELETONS" :key="n" />
    </div>

    <div
      v-else-if="isError"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your saved videos</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="refetch()">
        Retry
      </Button>
    </div>

    <WatchLaterEmpty v-else-if="!items.length" :signed-in="true" />

    <div v-else :class="GRID">
      <HomeWatchLaterCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        @remove="onRemove(item.id)"
      />
    </div>
  </div>
</template>
