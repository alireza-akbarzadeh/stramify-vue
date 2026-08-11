<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { useHistory, useHistorySearch, useRemoveFromHistory } from '@/composables/useHistory'
import { useAuthStore } from '@/stores/auth'
import { groupHistoryByDay } from '#shared/utils/history'
import HistoryEmpty from './HistoryEmpty.vue'
import HistoryList from './HistoryList.vue'
import HistorySkeleton from './HistorySkeleton.vue'
import HistoryToolbar from './HistoryToolbar.vue'

/**
 * `/history` — every video this viewer has watched, newest first, grouped by
 * the day they watched it.
 *
 * Grouping happens here rather than in SQL because the day boundary is the
 * viewer's, not the server's, and because a day's rows can straddle a page
 * boundary — the server would have to know about pagination to group correctly.
 * See `groupHistoryByDay`.
 */
const auth = useAuthStore()
const { term, debounced } = useHistorySearch()
const history = useHistory(debounced)
const remove = useRemoveFromHistory()

/**
 * A disabled TanStack query stays `pending` forever, so every signed-in-only
 * surface has to check the session before trusting it — otherwise a logged-out
 * visitor gets skeletons that never resolve. Same guard as `FollowingView`.
 */
const signedIn = computed(() => auth.isAuthenticated)
const pending = computed(() => signedIn.value && history.isPending.value)

const items = computed(() => history.data.value?.pages.flatMap((page) => page.items) ?? [])
const groups = computed(() => groupHistoryByDay(items.value))

function onRemove(slug: string) {
  remove.mutate(slug, {
    onError: () => toast.error("Couldn't remove that from your history.")
  })
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
    <header class="space-y-4 py-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Watch history</h1>
        <p class="mt-1 text-sm text-muted-foreground">Pick up any video where you left off.</p>
      </div>

      <HistoryToolbar v-if="signedIn" v-model="term" :has-history="items.length > 0" />
    </header>

    <HistoryEmpty v-if="!signedIn" :search="''" :signed-in="false" />

    <HistorySkeleton v-else-if="pending" />

    <div
      v-else-if="history.isError.value"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your history</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="history.refetch()">
        Retry
      </Button>
    </div>

    <HistoryEmpty
      v-else-if="!items.length"
      :search="debounced"
      :signed-in="true"
      @clear-search="term = ''"
    />

    <HistoryList
      v-else
      :groups="groups"
      :has-next-page="history.hasNextPage.value ?? false"
      :is-loading-more="history.isFetchingNextPage.value"
      @load-more="history.fetchNextPage()"
      @remove="onRemove"
    />
  </div>
</template>
