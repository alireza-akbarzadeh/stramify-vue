<script lang="ts" setup>
import { MonitorUp, SearchX, TriangleAlert } from '@lucide/vue'
import StudioDeleteDialog from './StudioDeleteDialog.vue'
import StudioVideoFilters from './StudioVideoFilters.vue'
import StudioVideoRow from './StudioVideoRow.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { useStudioFilters } from '../../../composables/useStudioFilters'
import { useDeleteStudioVideo, useStudioVideos } from '../../../composables/useStudioVideos'
import type { StudioVideo } from '#shared/types/studio'

/**
 * The content manager: every upload this account owns, with edit and delete.
 *
 * Four states, all of them real screens rather than a spinner standing in for
 * three of them — loading, failed, nothing uploaded yet, and nothing matching
 * the current filter. The last two are separate on purpose: offering "upload
 * your first video" to someone who has forty and typed a typo is a dead end,
 * and so is offering "clear filters" to someone who has none.
 */
const { data: videos, isPending, isError, refetch } = useStudioVideos()
const { search, visibility, sort, filtered, filtering, clear } = useStudioFilters(videos)

const remove = useDeleteStudioVideo()
const pendingDelete = ref<StudioVideo | null>(null)

async function confirmDelete() {
  const video = pendingDelete.value
  if (!video) return

  try {
    await remove.mutateAsync(video.id)
    pendingDelete.value = null
    toast.success(`“${video.title}” was deleted`)
  } catch (error) {
    // The optimistic removal has already been rolled back by the mutation, so
    // the row is back on screen and the message explains why.
    toast.error(error instanceof Error ? error.message : 'Could not delete that video')
  }
}
</script>

<template>
  <div>
    <div v-if="isPending" class="grid gap-3">
      <span class="sr-only" role="status">Loading your videos</span>
      <!-- Same geometry as a real row, so nothing jumps when the data lands. -->
      <Skeleton
          v-for="index in 4"
          :key="index"
          class="h-28 rounded-2xl sm:h-24"
      />
    </div>

    <div
        v-else-if="isError"
        class="grid justify-items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-14 text-center"
    >
      <TriangleAlert aria-hidden="true" class="size-8 text-warning"/>
      <p class="text-sm font-semibold text-foreground">We couldn't load your videos</p>
      <p class="max-w-sm text-sm text-muted-foreground">
        The request didn't get through. Your videos are safe — this is only the list.
      </p>
      <Button class="mt-1" variant="outline" @click="refetch()">Try again</Button>
    </div>

    <div
        v-else-if="!videos?.length"
        class="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-2/40 px-6 py-16 text-center"
    >
      <MonitorUp aria-hidden="true" class="size-8 text-muted-foreground"/>
      <p class="text-sm font-semibold text-foreground">You haven't uploaded anything yet</p>
      <p class="max-w-sm text-sm text-muted-foreground">
        Your videos and tracks will live here — with their views, comments and who can see them.
      </p>
      <Button as-child class="mt-1">
        <NuxtLink to="/studio/upload">Upload your first video</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <StudioVideoFilters
          :search="search"
          :sort="sort"
          :total="filtered.length"
          :visibility="visibility"
          @update:search="search = $event"
          @update:sort="sort = $event"
          @update:visibility="visibility = $event"
      />

      <div
          v-if="!filtered.length"
          class="grid justify-items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-14 text-center"
      >
        <SearchX aria-hidden="true" class="size-8 text-muted-foreground"/>
        <p class="text-sm font-semibold text-foreground">Nothing matches those filters</p>
        <Button v-if="filtering" class="mt-1" variant="outline" @click="clear">
          Clear filters
        </Button>
      </div>

      <ul v-else class="grid gap-3">
        <StudioVideoRow
            v-for="video in filtered"
            :key="video.id"
            :video="video"
            @delete="pendingDelete = $event"
        />
      </ul>
    </template>

    <StudioDeleteDialog
        :pending="remove.isPending.value"
        :video="pendingDelete"
        @confirm="confirmDelete"
        @update:open="!$event && (pendingDelete = null)"
    />
  </div>
</template>
