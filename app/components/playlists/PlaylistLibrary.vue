<script setup lang="ts">
import { ListVideo } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useCreatePlaylist, useDeletePlaylist, usePlaylists } from '@/composables/usePlaylists'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PlaylistCard from './PlaylistCard.vue'
import PlaylistCreateDialog from './PlaylistCreateDialog.vue'
import type { PlaylistDraft } from '#shared/types/library'

/**
 * `/playlists` — the viewer's own collections.
 *
 * Four states, and the signed-out one is its own: a query that's disabled
 * (which is what `usePlaylists` does with no session) stays `pending` forever,
 * so checking the session first is what stops this rendering skeletons at a
 * logged-out visitor indefinitely.
 */
const auth = useAuthStore()
const { data, isPending, isError, refetch } = usePlaylists()
const create = useCreatePlaylist()
const remove = useDeletePlaylist()

const playlists = computed(() => data.value ?? [])
const createOpen = ref(false)

function onCreate(draft: PlaylistDraft) {
  create.mutate(draft, {
    onSuccess: (playlist) => {
      createOpen.value = false
      toast.success(`Created "${playlist.title}"`)
    },
    onError: () => toast.error("Couldn't create that playlist.")
  })
}

function onDelete(id: string, title: string) {
  remove.mutate(id, {
    onSuccess: () => toast.success(`Deleted "${title}"`),
    onError: () => toast.error("Couldn't delete that playlist.")
  })
}

const GRID = 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
const SKELETONS = 8
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-foreground">Playlists</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Your own collections of clips, in the order you put them.
        </p>
      </div>
      <PlaylistCreateDialog
        v-if="auth.isAuthenticated"
        v-model:open="createOpen"
        :pending="create.isPending.value"
        @create="onCreate"
      />
    </div>

    <div
      v-if="!auth.isAuthenticated"
      class="rounded-xl border border-dashed border-border py-16 text-center"
    >
      <ListVideo class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <p class="mt-3 text-lg font-semibold text-foreground">Log in to build playlists</p>
      <p class="mt-2 text-sm text-muted-foreground">
        Playlists are saved to your account, so they follow you between devices.
      </p>
      <Button as-child class="mt-4" size="sm">
        <NuxtLink to="/login">Log in</NuxtLink>
      </Button>
    </div>

    <div v-else-if="isPending" :class="GRID" role="status" aria-label="Loading your playlists">
      <div v-for="n in SKELETONS" :key="n">
        <Skeleton class="aspect-video w-full rounded-xl" />
        <Skeleton class="mt-3 h-4 w-3/5 rounded-sm" />
        <Skeleton class="mt-2 h-3 w-2/5 rounded-sm" />
      </div>
    </div>

    <div
      v-else-if="isError"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your playlists</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="refetch()">
        Retry
      </Button>
    </div>

    <div
      v-else-if="!playlists.length"
      class="rounded-xl border border-dashed border-border py-16 text-center"
    >
      <ListVideo class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <p class="mt-3 text-lg font-semibold text-foreground">No playlists yet</p>
      <p class="mt-2 text-sm text-muted-foreground">
        Create one here, or use "Save" on any clip to start a collection.
      </p>
      <Button class="mt-4" size="sm" type="button" @click="createOpen = true">
        New playlist
      </Button>
    </div>

    <div v-else :class="GRID">
      <PlaylistCard
        v-for="playlist in playlists"
        :key="playlist.id"
        deletable
        :playlist="playlist"
        @delete="onDelete(playlist.id, playlist.title)"
      />
    </div>
  </div>
</template>
