<script lang="ts" setup>
import StudioChoiceGroup from '../StudioChoiceGroup.vue'
import type { Choice } from '../StudioChoiceGroup.vue'
import UploadProgress from './UploadProgress.vue'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { formatDuration } from '#shared/utils/format'
import { CLIP_VISIBILITIES, VISIBILITY_COPY } from '#shared/utils/studio'
import type { ClipVisibility, StudioMediaKind } from '#shared/types/studio'

/**
 * The last step: who gets to see this, and a summary of what's about to be
 * published.
 *
 * Visibility is its own step rather than one more field on the details form
 * because it's the only irreversible-feeling choice in the flow — everything
 * else can be edited afterwards with no consequence, while publishing to the
 * world is the thing a creator wants to have decided deliberately. The review
 * panel beside it exists so that decision is made while looking at what's
 * actually going out.
 */
defineProps<{
  kind: StudioMediaKind
  fileName: string
  durationSeconds: number
  thumbnailUrl: string
  title: string
  uploading: boolean
  progress: number
}>()

const visibilityChoices: Choice<ClipVisibility>[] = CLIP_VISIBILITIES.map((value) => ({
  value,
  label: VISIBILITY_COPY[value].label,
  detail: VISIBILITY_COPY[value].detail
}))
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_20rem]">
    <FormField v-slot="{ value, handleChange }" name="visibility">
      <FormItem>
        <h2 class="text-base font-semibold text-foreground">Who can watch this?</h2>
        <p class="mb-2 text-sm text-muted-foreground">
          You can change this at any time from your content list.
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

    <aside class="rounded-2xl border border-border bg-surface-2/40 p-4">
      <h3 class="text-sm font-semibold text-foreground">Ready to publish</h3>

      <div class="mt-3 aspect-video overflow-hidden rounded-xl border border-border bg-surface-3/60">
        <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="" class="size-full object-cover">
      </div>

      <dl class="mt-4 grid gap-2 text-xs">
        <div class="flex justify-between gap-3">
          <dt class="text-muted-foreground">Title</dt>
          <dd class="min-w-0 truncate font-medium text-foreground">{{ title || '—' }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-muted-foreground">{{ kind === 'music' ? 'Track' : 'File' }}</dt>
          <dd class="min-w-0 truncate font-medium text-foreground">{{ fileName }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-muted-foreground">Length</dt>
          <dd class="font-medium tabular-nums text-foreground">
            {{ durationSeconds ? formatDuration(durationSeconds) : '—' }}
          </dd>
        </div>
      </dl>

      <!--
        The bar replaces nothing — it appears under the summary while the
        transfer runs, so the creator can still see what is being sent.
      -->
      <div v-if="uploading" class="mt-4 border-t border-border pt-4">
        <UploadProgress :percent="progress" label="Uploading"/>
      </div>
    </aside>
  </div>
</template>
