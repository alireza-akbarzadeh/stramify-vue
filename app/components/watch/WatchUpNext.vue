<script setup lang="ts">
import type { RelatedItem } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { filterUpNext, upNextHasBothKinds } from '@/utils/upNext'
import type { UpNextKind } from '@/utils/upNext'
import { relatedToItem } from '@/utils/watchlist'
import WatchUpNextCard from './WatchUpNextCard.vue'
import WatchUpNextFilters from './WatchUpNextFilters.vue'

const props = defineProps<{
  items: RelatedItem[]
  pending: boolean
  errored: boolean
}>()
const emit = defineEmits<{ (e: 'retry'): void }>()

const saved = useSavedVideos()

const query = ref('')
const kind = ref<UpNextKind>('all')

const visible = computed(() => filterUpNext(props.items, query.value, kind.value))

/**
 * Worth offering below a handful of items? No. The controls are two rows of
 * chrome, and filtering four cards you can already see whole is a worse rail
 * than four cards. Twelve is what the endpoint returns (`related.get.ts`), so
 * in practice this is on.
 */
const FILTERABLE_FROM = 5
const showFilters = computed(() => props.items.length >= FILTERABLE_FROM)

function reset() {
  query.value = ''
  kind.value = 'all'
}

/**
 * Clear the filter when the *video* changes.
 *
 * This component stays mounted as you walk from one watch page to the next —
 * only its `items` prop is replaced — so a query typed for the last video would
 * silently hide most of the new rail, which reads as "there's nothing related"
 * rather than "you're still searching".
 *
 * Keyed on the ids rather than on the array itself: a background refetch that
 * returns the same twelve videos hands over a new array, and wiping what
 * someone is halfway through typing is exactly the kind of thing that makes an
 * input feel broken.
 */
watch(() => props.items.map((item) => item.id).join(), reset)
</script>

<template>
  <section aria-labelledby="up-next-heading">
    <h2 id="up-next-heading" class="mb-4 text-base font-semibold text-foreground">Up next</h2>

    <div v-if="pending" class="space-y-4">
      <div v-for="n in 5" :key="n" class="flex gap-3">
        <div class="aspect-video w-32 shrink-0 animate-pulse rounded-lg bg-muted sm:w-40" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 w-full animate-pulse rounded bg-muted" />
          <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>

    <div
      v-else-if="errored"
      class="rounded-lg border border-dashed border-destructive/40 p-6 text-center"
    >
      <p class="text-sm font-medium text-foreground">Couldn't load recommendations</p>
      <Button type="button" variant="outline" size="sm" class="mt-3" @click="emit('retry')">
        Retry
      </Button>
    </div>

    <p
      v-else-if="!items.length"
      class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
    >
      Nothing else in this category yet.
    </p>

    <template v-else>
      <WatchUpNextFilters
        v-if="showFilters"
        v-model:query="query"
        v-model:kind="kind"
        :show-kinds="upNextHasBothKinds(items)"
        :shown="visible.length"
        :total="items.length"
      />

      <!-- Distinct from the "nothing related" state above: that one is about
           the video, this one is about what you just typed, so it offers the
           way back out rather than an apology. -->
      <div
        v-if="!visible.length"
        class="rounded-lg border border-dashed border-border p-6 text-center"
      >
        <p class="text-sm text-muted-foreground">
          Nothing here matches
          <span v-if="query.trim()" class="font-medium text-foreground">“{{ query.trim() }}”</span>
          <span v-else>that filter</span>.
        </p>
        <Button type="button" variant="outline" size="sm" class="mt-3" @click="reset">
          Clear filter
        </Button>
      </div>

      <div v-else class="space-y-4">
        <WatchUpNextCard
          v-for="item in visible"
          :key="item.id"
          :item="item"
          :saved="saved.isSaved(item.id, item.kind)"
          @toggle-save="saved.toggle(relatedToItem(item))"
        />
      </div>
    </template>
  </section>
</template>
