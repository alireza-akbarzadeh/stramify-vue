<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  useLikedFilters,
  useLikedVideos,
  useRemoveLike,
  useRestoreLike
} from '@/composables/useLiked'
import { useAuthStore } from '@/stores/auth'
import LikedEmpty from './LikedEmpty.vue'
import LikedGrid from './LikedGrid.vue'
import LikedToolbar from './LikedToolbar.vue'

/**
 * `/liked` — every video this viewer gave a thumbs up, searchable and
 * reorderable.
 *
 * The same `reactions` rows the watch page's thumbs-up writes, read back as a
 * library. Nothing here is a second copy of that state: unliking from a card
 * deletes the row the button set, and the button reads it again on the way
 * back — see `useRemoveLike`.
 */
const auth = useAuthStore()
const { term, debounced, sort } = useLikedFilters()
const liked = useLikedVideos(debounced, sort)
const remove = useRemoveLike()
const restore = useRestoreLike()

/**
 * A disabled TanStack query stays `pending` forever, so every signed-in-only
 * surface has to check the session before trusting it — otherwise a logged-out
 * visitor gets skeletons that never resolve. Same guard as `HistoryView`.
 */
const signedIn = computed(() => auth.isAuthenticated)
const pending = computed(() => signedIn.value && liked.isPending.value)

const items = computed(() => liked.data.value?.pages.flatMap((page) => page.items) ?? [])

/**
 * The undo is the point: a like is one tap to lose, and without a way back an
 * accidental "Remove" quietly costs the viewer a video they can no longer find.
 * The toast carries it because once the ⋮ menu has closed, the toast is the
 * only thing on screen that still knows what happened — same arrangement as
 * "Saved to Watch later".
 */
function onRemove(clipId: string) {
  remove.mutate(clipId, {
    onSuccess: () =>
      toast('Removed from Liked videos', {
        action: { label: 'Undo', onClick: () => restore.mutate(clipId) }
      }),
    onError: () => toast.error("Couldn't remove that from your liked videos.")
  })
}
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
    <header class="space-y-4 py-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Liked videos</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Everything you gave a thumbs up, ready to watch again.
        </p>
      </div>

      <LikedToolbar v-if="signedIn" v-model:sort="sort" v-model:term="term" />
    </header>

    <LikedEmpty v-if="!signedIn" :search="''" :signed-in="false" />

    <div
      v-else-if="liked.isError.value"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
      role="alert"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your liked videos</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="liked.refetch()">
        Retry
      </Button>
    </div>

    <LikedEmpty
      v-else-if="!pending && !items.length"
      :search="debounced"
      :signed-in="true"
      @clear-search="term = ''"
    />

    <LikedGrid
      v-else
      :has-next-page="liked.hasNextPage.value ?? false"
      :is-loading-more="liked.isFetchingNextPage.value"
      :items="items"
      :pending="pending"
      @load-more="liked.fetchNextPage()"
      @remove="onRemove"
    />
  </div>
</template>
