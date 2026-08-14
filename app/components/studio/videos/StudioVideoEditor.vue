<script lang="ts" setup>
import { useForm } from 'vee-validate'
import { ExternalLink, Loader2, Trash2 } from '@lucide/vue'
import StudioChoiceGroup from '../StudioChoiceGroup.vue'
import type { Choice } from '../StudioChoiceGroup.vue'
import StudioVideoFields from '../StudioVideoFields.vue'
import StudioDeleteDialog from './StudioDeleteDialog.vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { toast } from '@/components/ui/sonner'
import { studioDetailsValidation } from '@/utils/studio-form'
import type { StudioDetails } from '@/utils/studio-form'
import { useDeleteStudioVideo, useUpdateStudioVideo } from '@/composables/useStudioVideos'
import { VISIBILITY_COPY } from '#shared/utils/studio'
import { formatCount, formatDuration, formatRelativeTime } from '#shared/utils/format'
import { CLIP_VISIBILITIES } from '#shared/types/studio'
import type { ClipVisibility, StudioVideo } from '#shared/types/studio'

/**
 * Edit one upload: its title, description, category and who can see it.
 *
 * Reuses `StudioVideoFields` — the same three inputs, the same schema, the
 * same limits as the upload wizard — so the two surfaces cannot drift into
 * disagreeing about what a valid video is. What this adds is the parts that
 * only make sense for something already published: the stats panel, the link
 * to the live watch page, and delete.
 *
 * The media itself is deliberately not replaceable. Swapping the file under a
 * published id would silently change what everyone who already commented,
 * liked or saved it was talking about — YouTube refuses this for the same
 * reason. Delete and re-upload is the honest path, and it's right there.
 */
const props = defineProps<{ video: StudioVideo }>()

const update = useUpdateStudioVideo()
const remove = useDeleteStudioVideo()
const pendingDelete = ref<StudioVideo | null>(null)

const initialValues = computed<StudioDetails>(() => ({
  title: props.video.title,
  description: props.video.description,
  category: props.video.category,
  visibility: props.video.visibility
}))

const { handleSubmit, meta, resetForm } = useForm<StudioDetails>({
  validationSchema: studioDetailsValidation,
  initialValues: initialValues.value
})

// Re-seed when the query refetches a newer row — without this, a save in
// another tab would leave this form showing values it thinks are still clean.
watch(initialValues, (values) => resetForm({ values }))

const visibilityChoices: Choice<ClipVisibility>[] = CLIP_VISIBILITIES.map((value) => ({
  value,
  label: VISIBILITY_COPY[value].label,
  detail: VISIBILITY_COPY[value].detail
}))

const watchPath = computed(() => `/watch/${encodeURIComponent(props.video.id)}`)

const onSubmit = handleSubmit(async (values) => {
  try {
    await update.mutateAsync({ id: props.video.id, patch: values })
    // Marks the form clean again, so the Save button correctly goes back to
    // disabled and "unsaved changes" stops being true.
    resetForm({ values })
    toast.success('Changes saved')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save your changes')
  }
})

async function confirmDelete() {
  try {
    await remove.mutateAsync(props.video.id)
    toast.success(`“${props.video.title}” was deleted`)
    await navigateTo('/studio/videos')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not delete that video')
  }
}
</script>

<template>
  <form class="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start" novalidate @submit="onSubmit">
    <div class="grid gap-8">
      <div class="rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
        <StudioVideoFields/>
      </div>

      <div class="rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
        <FormField v-slot="{ value, handleChange }" name="visibility">
          <FormItem>
            <h2 class="text-base font-semibold text-foreground">Visibility</h2>
            <p class="mb-2 text-sm text-muted-foreground">
              Changing this takes effect immediately.
            </p>

            <FormControl>
              <StudioChoiceGroup
                  :choices="visibilityChoices"
                  :columns="2"
                  :model-value="value"
                  label="Visibility"
                  @update:model-value="handleChange"
              />
            </FormControl>

            <FormMessage/>
          </FormItem>
        </FormField>
      </div>

      <!--
        Separated from the form's own actions by its own bordered block —
        destructive actions shouldn't sit next to Save where a mis-aimed click
        lands on the wrong one (UX: `destructive-emphasis`).
      -->
      <div class="rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-5 sm:p-7">
        <h2 class="text-base font-semibold text-foreground">Delete this video</h2>
        <p class="mb-4 mt-1 text-sm text-muted-foreground">
          Removes the file, the thumbnail, and every comment and like on it. There's no undo.
        </p>
        <Button type="button" variant="destructive" @click="pendingDelete = video">
          <Trash2 aria-hidden="true"/>
          Delete video
        </Button>
      </div>
    </div>

    <aside class="grid gap-4 lg:sticky lg:top-24">
      <div class="overflow-hidden rounded-2xl border border-border bg-card/60">
        <div class="aspect-video bg-surface-3/60">
          <img :alt="''" :src="video.thumbnailUrl" class="size-full object-cover">
        </div>

        <dl class="grid gap-2.5 p-4 text-xs">
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">Views</dt>
            <dd class="font-semibold tabular-nums text-foreground">{{ formatCount(video.views) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">Likes</dt>
            <dd class="font-semibold tabular-nums text-foreground">{{ formatCount(video.likes) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">Comments</dt>
            <dd class="font-semibold tabular-nums text-foreground">
              {{ formatCount(video.comments) }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">Length</dt>
            <dd class="font-semibold tabular-nums text-foreground">
              {{ video.durationSeconds ? formatDuration(video.durationSeconds) : '—' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted-foreground">Published</dt>
            <dd class="font-semibold text-foreground">{{ formatRelativeTime(video.createdAt) }}</dd>
          </div>
        </dl>

        <div class="border-t border-border p-4">
          <Button as-child class="w-full" size="sm" variant="outline">
            <NuxtLink :to="watchPath">
              <ExternalLink aria-hidden="true"/>
              Open watch page
            </NuxtLink>
          </Button>
        </div>
      </div>

      <!--
        Sticky under the stats rather than pinned to the viewport bottom: the
        form is short enough that Save is never far, and a floating bar would
        sit on top of the delete block on a phone.
      -->
      <div class="flex items-center gap-2">
        <Button :disabled="!meta.dirty || update.isPending.value" class="flex-1" type="submit">
          <Loader2 v-if="update.isPending.value" aria-hidden="true" class="animate-spin"/>
          {{ update.isPending.value ? 'Saving…' : 'Save changes' }}
        </Button>
        <Button
            :disabled="!meta.dirty || update.isPending.value"
            type="button"
            variant="ghost"
            @click="resetForm({ values: initialValues })"
        >
          Undo
        </Button>
      </div>

      <p v-if="meta.dirty" class="text-center text-xs text-muted-foreground">
        You have unsaved changes.
      </p>
    </aside>

    <StudioDeleteDialog
        :pending="remove.isPending.value"
        :video="pendingDelete"
        @confirm="confirmDelete"
        @update:open="!$event && (pendingDelete = null)"
    />
  </form>
</template>
