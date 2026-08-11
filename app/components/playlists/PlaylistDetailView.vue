<script setup lang="ts">
import { ArrowLeft, Lock, Play, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { usePlaylist, useRemovePlaylistItem } from '@/composables/usePlaylists'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PlaylistRow from './PlaylistRow.vue'
import { playlistCountLabel } from '#shared/utils/library'

/**
 * `/playlists/[id]` — one playlist, header beside its contents.
 *
 * A numbered list rather than a grid: a playlist has an order and the order is
 * the point, which a wall of equal-weight cards hides. Same reasoning as the
 * watch page's up-next rail using rows.
 *
 * Removal only renders for the owner, and the server re-checks that on every
 * write — the missing button is a convenience, not the authorization.
 */
const props = defineProps<{ id: string }>()

const { data, isPending, isError, error, refetch } = usePlaylist(() => props.id)
const removeItem = useRemovePlaylistItem(() => props.id)

const notFound = computed(
  () => (error.value as { statusCode?: number } | null)?.statusCode === 404
)
const items = computed(() => data.value?.items ?? [])
const playAllHref = computed(() => {
  const first = items.value[0]
  return first ? `/watch/${encodeURIComponent(first.slug)}` : null
})

function onRemove(clipId: string) {
  removeItem.mutate(clipId, {
    onError: () => toast.error("Couldn't remove that video.")
  })
}

useHead({
  title: computed(() => (data.value ? `${data.value.title} — Streamify` : 'Playlist — Streamify'))
})
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
    <div v-if="notFound" class="rounded-xl border border-dashed border-border py-20 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-primary">Not available</p>
      <h1 class="mt-2 text-2xl font-semibold text-foreground">We couldn't find that playlist</h1>
      <p class="mt-3 text-sm text-muted-foreground">
        It may have been deleted, or it's private and belongs to someone else.
      </p>
      <Button as-child class="mt-6" size="sm">
        <NuxtLink to="/playlists">
          <ArrowLeft />
          Your playlists
        </NuxtLink>
      </Button>
    </div>

    <div
      v-else-if="isError"
      class="rounded-xl border border-dashed border-destructive/40 py-20 text-center"
    >
      <h1 class="text-lg font-semibold text-foreground">Couldn't load this playlist</h1>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="refetch()">
        Retry
      </Button>
    </div>

    <div v-else class="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
      <header class="lg:sticky lg:top-20 lg:self-start">
        <template v-if="isPending">
          <Skeleton class="aspect-video w-full rounded-xl" />
          <Skeleton class="mt-4 h-6 w-2/3 rounded-sm" />
          <Skeleton class="mt-2 h-4 w-1/2 rounded-sm" />
        </template>

        <template v-else-if="data">
          <div class="aspect-video overflow-hidden rounded-xl bg-muted">
            <img
              v-if="data.covers.length"
              :src="data.covers[0]"
              :alt="data.title"
              class="size-full object-cover"
            />
          </div>

          <h1 class="mt-4 text-2xl font-semibold text-foreground">{{ data.title }}</h1>
          <p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock v-if="data.visibility === 'private'" class="size-3.5" aria-hidden="true" />
            <span>{{ playlistCountLabel(data.itemCount) }} · {{ data.updatedAt }}</span>
          </p>
          <p v-if="data.description" class="mt-3 text-sm text-muted-foreground">
            {{ data.description }}
          </p>

          <Button v-if="playAllHref" as-child class="mt-4" size="sm">
            <NuxtLink :to="playAllHref">
              <Play class="fill-current" />
              Play all
            </NuxtLink>
          </Button>
        </template>
      </header>

      <section aria-label="Videos in this playlist">
        <ol v-if="isPending" class="space-y-3" role="status" aria-label="Loading this playlist">
          <li v-for="n in 6" :key="n" class="flex gap-4">
            <Skeleton class="aspect-video w-40 shrink-0 rounded-lg" />
            <div class="min-w-0 flex-1">
              <Skeleton class="h-4 w-3/4 rounded-sm" />
              <Skeleton class="mt-2 h-3 w-1/3 rounded-sm" />
            </div>
          </li>
        </ol>

        <div
          v-else-if="!items.length"
          class="rounded-xl border border-dashed border-border py-16 text-center"
        >
          <p class="text-lg font-semibold text-foreground">This playlist is empty</p>
          <p class="mt-2 text-sm text-muted-foreground">
            Open any clip and use "Save" to add it here.
          </p>
          <Button as-child class="mt-4" size="sm" variant="outline">
            <NuxtLink to="/clips">Browse clips</NuxtLink>
          </Button>
        </div>

        <ol v-else class="space-y-2">
          <li v-for="(item, index) in items" :key="item.id" class="group relative">
            <PlaylistRow :item="item" :index="index + 1" />
            <Button
              v-if="data?.isOwner"
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-1 top-1 size-8 rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              :aria-label="`Remove ${item.title} from this playlist`"
              @click="onRemove(item.id)"
            >
              <X class="size-4" />
            </Button>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
