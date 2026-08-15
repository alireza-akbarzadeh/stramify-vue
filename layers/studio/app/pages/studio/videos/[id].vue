<script lang="ts" setup>
import { ArrowLeft, TriangleAlert } from '@lucide/vue'
import StudioPageHeader from '../../../components/studio/StudioPageHeader.vue'
import StudioVideoEditor from '../../../components/studio/videos/StudioVideoEditor.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudioVideo } from '../../../composables/useStudioVideos'

/**
 * Edit one of your uploads.
 *
 * A route rather than a sheet over the content list, so the URL is the thing
 * being edited: refreshable, bookmarkable and back-button-correct. The list
 * links straight here.
 */
definePageMeta({middleware: 'auth', layout: 'studio'})

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))

const {data: video, isPending, isError} = useStudioVideo(id)

// The title follows the video once it loads, so a pinned tab says which one.
useHead({title: () => `${video.value?.title ?? 'Edit video'} — Streamify Studio`})
</script>

<template>
  <div>
    <StudioPageHeader
        :description="video ? undefined : 'Loading this video…'"
        :title="video?.title ?? 'Edit video'"
    >
      <template #actions>
        <Button as-child size="sm" variant="ghost">
          <NuxtLink to="/studio/videos">
            <ArrowLeft aria-hidden="true"/>
            All content
          </NuxtLink>
        </Button>
      </template>
    </StudioPageHeader>

    <div v-if="isPending" class="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <span class="sr-only" role="status">Loading this video</span>
      <Skeleton class="h-96 rounded-2xl"/>
      <Skeleton class="h-72 rounded-2xl"/>
    </div>

    <!--
      404 and a network failure land here together on purpose: the endpoint
      answers 404 for a video that isn't yours, so "we couldn't find it" is
      the honest message for both without telling a stranger which it was.
    -->
    <div
        v-else-if="isError || !video"
        class="grid justify-items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-16 text-center"
    >
      <TriangleAlert aria-hidden="true" class="size-8 text-warning"/>
      <p class="text-sm font-semibold text-foreground">We couldn't find that video</p>
      <p class="max-w-sm text-sm text-muted-foreground">
        It may have been deleted, or it belongs to another account.
      </p>
      <Button as-child class="mt-1" variant="outline">
        <NuxtLink to="/studio/videos">Back to your content</NuxtLink>
      </Button>
    </div>

    <StudioVideoEditor v-else :video="video"/>
  </div>
</template>
